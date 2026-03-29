"""
Shared controller utilities — REST edition.

Every controller route calls call_and_log() as its single entry point.
This handles:
  - API key validation       (X-ESS-API-Key header vs ir.config_parameter)
  - Auth context extraction  (get_auth_context)
  - Request body parsing     (get_body)
  - Execution + error catch  (fn lambda)
  - JSON HTTP response       (json_ok / json_error)
  - Silent audit logging     (ess.api.log)

Error status codes:
  400 — Validation / business logic error (UserError) — shown to user as-is
  401 — Unauthorized (bad API key)
  500 — Unexpected server error — generic message shown, real error logged

Auth context headers (sent by the mobile app with every request):
  Authorization            — Bearer <access_token>
  X-ESS-License-Key        — license key used to activate the app
  X-ESS-Company-ID         — selected company ID (integer)
  X-ESS-Employee-ID        — authenticated employee ID (integer)
  X-ESS-Login-Mode         — 'badge' | 'username'
  X-ESS-Login-Identifier   — badge_id or username (never password or pin)
  X-ESS-Server-URL         — Odoo server URL the app is connected to

API key setup (optional — skip for local dev):
  Odoo Settings → Technical → Parameters → System Parameters
  Key:   ess.api.key
  Value: <shared secret you configure in Django .env too>

  If the parameter is not set, the key check is skipped (open access).
"""
import json
import time
import logging

from odoo import http
from odoo.http import request
from odoo.exceptions import UserError, ValidationError

_logger = logging.getLogger(__name__)

# ir.config_parameter key for the shared API secret
_API_KEY_PARAM = 'ess.api.key'

# Endpoints that don't require an authenticated employee context
_PUBLIC_ENDPOINTS = {
    '/ess/api/auth/validate-license',
    '/ess/api/auth/login',
    '/ess/api/auth/refresh',
    '/ess/api/auth/logout',
}


# ─── Auth context ─────────────────────────────────────────────────────────────

def get_auth_context() -> dict:
    """
    Extract the full auth context that the mobile app sends with every request.

    Returns a dict with:
      access_token       — Bearer token (str, empty string if absent)
      license_key        — license key used to activate (str)
      company_id         — selected company ID (int or None)
      employee_id        — authenticated employee ID (int or None)
      login_mode         — 'badge' | 'username' | '' (str)
      login_identifier   — badge_id or username; never password or pin (str)
      server_url         — Odoo server URL the app is connected to (str)

    This is the single place to edit if header names ever change.
    All controllers call this via call_and_log — edit here, affects everywhere.
    """
    h = request.httprequest.headers
    raw_auth = h.get('Authorization', '')
    token = raw_auth[7:].strip() if raw_auth.startswith('Bearer ') else ''
    return {
        'access_token': token,
        'license_key': h.get('X-ESS-License-Key', ''),
        'company_id': _to_int(h.get('X-ESS-Company-ID')),
        'employee_id': _to_int(h.get('X-ESS-Employee-ID')),
        'login_mode': h.get('X-ESS-Login-Mode', ''),
        'login_identifier': h.get('X-ESS-Login-Identifier', ''),
        'server_url': h.get('X-ESS-Server-URL', ''),
    }


# Backward-compat alias — prefer get_auth_context() in new code
get_request_context = get_auth_context


def _to_int(value):
    """Convert a string value to int, returning None on failure."""
    try:
        return int(value) if value else None
    except (ValueError, TypeError):
        return None


# ─── Request helpers ──────────────────────────────────────────────────────────

def get_body() -> dict:
    """Parse the JSON body or GET query params of the incoming HTTP request."""
    if request.httprequest.method == 'GET':
        return dict(request.httprequest.args)
    try:
        return json.loads(request.httprequest.data or b'{}')
    except (ValueError, TypeError):
        return {}


def _validate_api_key() -> bool:
    """
    Validate X-ESS-API-Key header against the value in ir.config_parameter.
    Returns True (open) when no key is configured — safe for local development.
    """
    stored = request.env['ir.config_parameter'].sudo().get_param(_API_KEY_PARAM, '')
    if not stored:
        return True  # no key set → open access (dev / testing)
    incoming = request.httprequest.headers.get('X-ESS-API-Key', '')
    return incoming == stored


# ─── Response helpers ─────────────────────────────────────────────────────────

def json_ok(data) -> http.Response:
    """200 JSON success response: { success: true, data: ... }"""
    return request.make_response(
        json.dumps({'success': True, 'data': data}),
        headers=[('Content-Type', 'application/json')],
    )


def json_error(message: str, status: int = 400, code: str = None) -> http.Response:
    """
    JSON error response matching the mobile ApiError type:
      { success: false, error: { code, message, message_ar } }
    """
    if code is None:
        code = 'VALIDATION_ERROR' if status == 400 else 'SERVER_ERROR'
    return request.make_response(
        json.dumps({
            'success': False,
            'error': {
                'code': code,
                'message': message,
                'message_ar': message,  # Arabic translation handled by i18n layer later
            },
        }),
        headers=[('Content-Type', 'application/json')],
        status=status,
    )


# ─── Main entry point ─────────────────────────────────────────────────────────

def call_and_log(endpoint: str, fn) -> http.Response:
    """
    Single entry point for every controller route:
      1. Validate API key
      2. Extract auth context from headers (get_auth_context)
      3. Execute fn()
      4. Return JSON HTTP response
      5. Log the call silently (never raises)

    The employee_id for logging is read automatically from X-ESS-Employee-ID header.

    Status code mapping:
      UserError  → 400  (bad input / business rule — message safe to show user)
      other      → 500  (unexpected — log internally, show generic message)
    """
    if not _validate_api_key():
        return json_error('Unauthorized', 401, 'UNAUTHORIZED')

    ctx = get_auth_context()

    # Require auth context on all endpoints except the public whitelist
    if endpoint not in _PUBLIC_ENDPOINTS:
        if not ctx.get('employee_id') or not ctx.get('access_token'):
            return json_error(
                'Missing authentication context. Please log in again.',
                401, 'UNAUTHENTICATED',
            )

    start = time.time()
    error_msg = None
    try:
        result = fn()
        return json_ok(result)
    except (UserError, ValidationError) as exc:
        error_msg = str(exc).strip()
        return json_error(error_msg, 400, 'VALIDATION_ERROR')
    except Exception as exc:
        error_msg = str(exc)
        _logger.error('ESS API [%s]: %s', endpoint, exc, exc_info=True)
        return json_error('An unexpected error occurred. Please try again.', 500, 'SERVER_ERROR')
    finally:
        duration_ms = int((time.time() - start) * 1000)
        _write_log(endpoint, ctx.get('employee_id'), error_msg, duration_ms)


def _write_log(endpoint, employee_id, error_msg, duration_ms):
    """Write an audit log entry — silently ignored on failure."""
    try:
        request.env['ess.api.log'].sudo().write_log(
            endpoint=endpoint,
            employee_id=employee_id,
            status='error' if error_msg else 'success',
            error_message=error_msg or '',
            duration_ms=duration_ms,
            ip_address=request.httprequest.remote_addr,
        )
    except Exception:
        pass
