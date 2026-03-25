"""
Shared controller utilities — REST edition.

Every controller route calls call_and_log() as its single entry point.
This handles:
  - API key validation       (X-ESS-API-Key header vs ir.config_parameter)
  - Request body parsing     (_get_body)
  - Execution + error catch  (fn lambda)
  - JSON HTTP response       (_json_ok / _json_error)
  - Silent audit logging     (ess.api.log)

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

_logger = logging.getLogger(__name__)

# ir.config_parameter key for the shared API secret
_API_KEY_PARAM = 'ess.api.key'


# ─── Request helpers ──────────────────────────────────────────────────────────

def get_body() -> dict:
    """Parse the JSON body of the incoming HTTP request."""
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


def json_error(message: str, status: int = 400) -> http.Response:
    """JSON error response: { success: false, error: '...' }"""
    return request.make_response(
        json.dumps({'success': False, 'error': message}),
        headers=[('Content-Type', 'application/json')],
        status=status,
    )


# ─── Main entry point ─────────────────────────────────────────────────────────

def call_and_log(endpoint: str, employee_id, fn) -> http.Response:
    """
    Single entry point for every controller route:
      1. Validate API key
      2. Execute fn()
      3. Return JSON HTTP response
      4. Log the call silently (never raises)

    Usage in a controller:
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/leave/list', employee_id,
            lambda: request.env['hr.leave'].sudo().get_leave_requests(employee_id, ...),
        )
    """
    if not _validate_api_key():
        return json_error('Unauthorized', 401)

    start = time.time()
    error_msg = None
    try:
        result = fn()
        return json_ok(result)
    except Exception as exc:
        error_msg = str(exc)
        _logger.error('ESS API [%s]: %s', endpoint, exc)
        return json_error(str(exc), 500)
    finally:
        duration_ms = int((time.time() - start) * 1000)
        _write_log(endpoint, employee_id, error_msg, duration_ms)


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
