"""
Shared controller utilities for the ESS HR Client module.

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
  401 — Unauthorized (bad API key or missing auth)
  500 — Unexpected server error — generic message shown, real error logged

Auth context headers (sent by the mobile app with every request):
  Authorization            — Bearer <access_token>
  X-ESS-Company-ID         — selected company ID (integer)
  X-ESS-Employee-ID        — authenticated employee ID (integer)
  X-ESS-Login-Mode         — 'badge' | 'username'
  X-ESS-Login-Identifier   — badge_id or username (never password or pin)
  X-Timezone               — IANA timezone, e.g. 'Africa/Cairo' (required on
                             every non-public endpoint; see tz_utils.py)

API key setup (optional — skip for local dev):
  Odoo Settings → Technical → Parameters → System Parameters
  Key:   ess.api.key
  Value: <shared secret>

  If the parameter is not set, the key check is skipped (open access).

Admin stats key (for admin server to pull stats):
  Key:   ess.admin.api.key
  Value: <secret shared with admin server>
"""
import json
import time
import logging

from odoo import http
from odoo.http import request
from odoo.exceptions import UserError, ValidationError, AccessError

from ..tz_utils import validate_timezone_header, InvalidTimezoneError

_logger = logging.getLogger(__name__)

_API_KEY_PARAM = 'ess.api.key'
_ADMIN_API_KEY_PARAM = 'ess.admin.api.key'

# Endpoints that don't require an authenticated employee context
_PUBLIC_ENDPOINTS = {
    '/ess/api/auth/login',
    '/ess/api/auth/refresh',
    '/ess/api/auth/logout',
    '/ess/api/auth/companies',  # called before login — no employee token available
}

# Endpoints authenticated by admin API key instead of employee token
_ADMIN_ENDPOINTS = {
    '/ess/api/stats',
    '/ess/api/admin/force-logout',
}


# ─── Auth context ─────────────────────────────────────────────────────────────

def get_auth_context() -> dict:
    """
    Extract the auth context that the mobile app sends with every request.

    Returns a dict with:
      access_token       — Bearer token (str, empty string if absent)
      company_id         — selected company ID (int or None)
      employee_id        — authenticated employee ID (int or None)
      login_mode         — 'badge' | 'username' | '' (str)
      login_identifier   — badge_id or username; never password or pin (str)
      timezone           — IANA timezone from X-Timezone header, '' if absent (str)
    """
    h = request.httprequest.headers
    raw_auth = h.get('Authorization', '')
    token = raw_auth[7:].strip() if raw_auth.startswith('Bearer ') else ''
    return {
        'access_token': token,
        'company_id': _to_int(h.get('X-ESS-Company-ID')),
        'employee_id': _to_int(h.get('X-ESS-Employee-ID')),
        'login_mode': h.get('X-ESS-Login-Mode', ''),
        'login_identifier': h.get('X-ESS-Login-Identifier', ''),
        'force_logout_gen': _to_int(h.get('X-ESS-Force-Logout-Gen', '0')) or 0,
        'timezone': h.get('X-Timezone', ''),
    }


get_request_context = get_auth_context  # backward-compat alias


def _to_int(value):
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
    stored = request.env['ir.config_parameter'].sudo().get_param(_API_KEY_PARAM, '')
    if not stored:
        return True
    incoming = request.httprequest.headers.get('X-ESS-API-Key', '')
    return incoming == stored


def _validate_admin_api_key() -> bool:
    incoming = request.httprequest.headers.get('X-ESS-Admin-Key')
    if incoming is None:
        return False  # header absent → always deny
    stored = request.env['ir.config_parameter'].sudo().get_param(_ADMIN_API_KEY_PARAM, '')
    if not stored:
        return True  # key not configured → accept any present header
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
                'message_ar': message,
            },
        }),
        headers=[('Content-Type', 'application/json')],
        status=status,
    )


# ─── Main entry point ─────────────────────────────────────────────────────────

# ─── Record-level access helpers ─────────────────────────────────────────────

def check_record_access(env, acting_employee_id, record_employee_id, write=False):
    """
    Enforce record-level authorization.

    GET (write=False): own record, OR direct/leave manager of that employee, OR HR/Admin.
    PATCH / DELETE (write=True): own record only — managers cannot edit another employee's data.
    Raises AccessError on denial.
    """
    if not acting_employee_id:
        raise AccessError('Authentication required.')
    if acting_employee_id == record_employee_id:
        return
    if write:
        raise AccessError('You can only modify your own records.')
    acting_emp = env['hr.employee'].sudo().browse(acting_employee_id)
    if not acting_emp.exists() or not acting_emp.user_id:
        raise AccessError('Access denied.')
    user = acting_emp.user_id
    if (user.has_group('base.group_system') or
            user.has_group('hr.group_hr_manager') or
            user.has_group('hr.group_hr_user') or
            user.has_group('hr_holidays.group_hr_holidays_user')):
        return
    record_emp = env['hr.employee'].sudo().browse(record_employee_id)
    if record_emp.exists():
        if record_emp.parent_id and record_emp.parent_id.user_id.id == user.id:
            return
        if record_emp.leave_manager_id and record_emp.leave_manager_id.id == user.id:
            return
    raise AccessError('Access denied: this record belongs to another employee.')


def require_hr_or_admin(env, acting_employee_id):
    """Raise AccessError unless the acting employee is HR Officer or Admin."""
    emp = env['hr.employee'].sudo().browse(acting_employee_id)
    if not emp.exists() or not emp.user_id:
        raise AccessError('Access denied.')
    user = emp.user_id
    if (user.has_group('base.group_system') or
            user.has_group('hr.group_hr_manager') or
            user.has_group('hr.group_hr_user') or
            user.has_group('hr_holidays.group_hr_holidays_user')):
        return
    raise AccessError('Access denied: HR Officer or Admin role required.')


# ─── Main entry point ─────────────────────────────────────────────────────────

def call_and_log(endpoint: str, fn) -> http.Response:
    """
    Single entry point for every controller route:
      1. Validate API key (or admin key for stats endpoints)
      2. Extract auth context from headers
      3. Execute fn()
      4. Return JSON HTTP response
      5. Log the call silently (never raises)
    """
    # Admin-only endpoints use a separate key
    if endpoint in _ADMIN_ENDPOINTS:
        if not _validate_admin_api_key():
            return json_error('Unauthorized', 401, 'UNAUTHORIZED')
        start = time.time()
        error_msg = None
        try:
            result = fn()
            return json_ok(result)
        except AccessError as exc:
            error_msg = str(exc).strip()
            return json_error(error_msg, 403, 'ACCESS_DENIED')
        except (UserError, ValidationError) as exc:
            error_msg = str(exc).strip()
            return json_error(error_msg, 400, 'VALIDATION_ERROR')
        except Exception as exc:
            error_msg = str(exc)
            _logger.error('ESS API [%s]: %s', endpoint, exc, exc_info=True)
            return json_error('An unexpected error occurred. Please try again.', 500, 'SERVER_ERROR')
        finally:
            duration_ms = int((time.time() - start) * 1000)
            _write_log(endpoint, None, error_msg, duration_ms)

    if not _validate_api_key():
        return json_error('Unauthorized', 401, 'UNAUTHORIZED')

    ctx = get_auth_context()

    if endpoint not in _PUBLIC_ENDPOINTS:
        if not ctx.get('employee_id') or not ctx.get('access_token'):
            return json_error(
                'Missing authentication context. Please log in again.',
                401, 'UNAUTHENTICATED',
            )
        stored_gen = int(
            request.env['ir.config_parameter'].sudo()
            .get_param('ess.force_logout.generation', '0') or '0'
        )
        if ctx.get('force_logout_gen') != stored_gen:
            return json_error(
                'The administrator has logged you out. Please contact your administrator.',
                401, 'FORCE_LOGGED_OUT',
            )
        try:
            validate_timezone_header(ctx.get('timezone'))
        except InvalidTimezoneError as exc:
            return json_error(str(exc).strip(), 400, 'VALIDATION_ERROR')

    start = time.time()
    error_msg = None
    try:
        result = fn()
        return json_ok(result)
    except AccessError as exc:
        error_msg = str(exc).strip()
        return json_error(error_msg, 403, 'ACCESS_DENIED')
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
    """
    Write an API access log entry.
    Uses a savepoint so a failure never aborts the caller's transaction.
    """
    try:
        cr = request.env.cr
        cr.execute('SAVEPOINT ess_api_log_write')
        try:
            request.env['ess.api.log'].sudo().write_log(
                endpoint=endpoint,
                employee_id=employee_id,
                status='error' if error_msg else 'success',
                error_message=error_msg or '',
                duration_ms=duration_ms,
                ip_address=request.httprequest.remote_addr,
            )
            cr.execute('RELEASE SAVEPOINT ess_api_log_write')
        except Exception:
            try:
                cr.execute('ROLLBACK TO SAVEPOINT ess_api_log_write')
            except Exception:
                pass
    except Exception:
        pass
