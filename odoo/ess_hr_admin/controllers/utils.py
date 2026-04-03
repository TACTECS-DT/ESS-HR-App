"""
Shared controller utilities for the ESS HR Admin module.

All admin API endpoints use call_admin() as their entry point.
Authentication uses X-ESS-API-Key header (shared secret via ir.config_parameter ess.admin.api.key).
If the parameter is not set, the check is skipped (open for local dev).

Every call is logged to ess.api.call regardless of outcome.
"""
import json
import logging
import time

from odoo import http
from odoo.http import request
from odoo.exceptions import UserError, ValidationError
from odoo.addons.ess_hr_admin.exceptions import EssLicenseError

_logger = logging.getLogger(__name__)
_ADMIN_API_KEY_PARAM = 'ess.admin.api.key'


def get_body() -> dict:
    if request.httprequest.method == 'GET':
        return dict(request.httprequest.args)
    try:
        return json.loads(request.httprequest.data or b'{}')
    except (ValueError, TypeError):
        return {}


def _validate_api_key() -> bool:
    stored = request.env['ir.config_parameter'].sudo().get_param(_ADMIN_API_KEY_PARAM, '')
    if not stored:
        return True
    incoming = request.httprequest.headers.get('X-ESS-API-Key', '')
    return incoming == stored


def json_ok(data) -> http.Response:
    return request.make_response(
        json.dumps({'success': True, 'data': data}),
        headers=[('Content-Type', 'application/json')],
    )


def json_error(message: str, status: int = 400, code: str = None) -> http.Response:
    if code is None:
        code = 'VALIDATION_ERROR' if status == 400 else 'SERVER_ERROR'
    return request.make_response(
        json.dumps({
            'success': False,
            'error': {'code': code, 'message': message, 'message_ar': message},
        }),
        headers=[('Content-Type', 'application/json')],
        status=status,
    )


def _log_api_call(endpoint: str, server_url: str, success: bool, error_code: str, duration_ms: int):
    """Write one ess.api.call record. Never raises — logging must not break responses."""
    try:
        ip = request.httprequest.remote_addr

        # Resolve server_url to a server record if possible
        server_id = False
        if server_url:
            normalized = server_url.strip().rstrip('/').lower()
            server = request.env['ess.server'].sudo().search(
                [], limit=0
            ).filtered(lambda s: (s.url or '').strip().rstrip('/').lower() == normalized)[:1]
            if server:
                server_id = server.id

        request.env['ess.api.call'].sudo().create({
            'endpoint': endpoint,
            'server_url': server_url or False,
            'server_id': server_id,
            'success': success,
            'error_code': error_code or False,
            'ip_address': ip,
            'duration_ms': duration_ms,
        })
    except Exception as exc:
        _logger.warning('ESS Admin: failed to log API call to %s: %s', endpoint, exc)


def call_admin(endpoint: str, fn, *, server_url: str = None) -> http.Response:
    """Entry point for all admin API routes. Logs every call to ess.api.call."""
    if not _validate_api_key():
        _log_api_call(endpoint, server_url, False, 'UNAUTHORIZED', 0)
        return json_error('Unauthorized', 401, 'UNAUTHORIZED')

    start = time.monotonic()
    try:
        result = fn()
        duration_ms = int((time.monotonic() - start) * 1000)
        _log_api_call(endpoint, server_url, True, None, duration_ms)
        return json_ok(result)
    except EssLicenseError as exc:
        duration_ms = int((time.monotonic() - start) * 1000)
        _log_api_call(endpoint, server_url, False, exc.code, duration_ms)
        return json_error(str(exc).strip(), 400, exc.code)
    except (UserError, ValidationError) as exc:
        duration_ms = int((time.monotonic() - start) * 1000)
        _log_api_call(endpoint, server_url, False, 'VALIDATION_ERROR', duration_ms)
        return json_error(str(exc).strip(), 400, 'VALIDATION_ERROR')
    except Exception as exc:
        duration_ms = int((time.monotonic() - start) * 1000)
        _log_api_call(endpoint, server_url, False, 'SERVER_ERROR', duration_ms)
        _logger.error('ESS Admin API [%s]: %s', endpoint, exc, exc_info=True)
        return json_error('An unexpected error occurred.', 500, 'SERVER_ERROR')
