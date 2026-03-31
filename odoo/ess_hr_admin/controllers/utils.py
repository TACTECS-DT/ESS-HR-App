"""
Shared controller utilities for the ESS HR Admin module.

All admin API endpoints use call_admin() as their entry point.
Authentication uses X-ESS-API-Key header (shared secret via ir.config_parameter ess.admin.api.key).
If the parameter is not set, the check is skipped (open for local dev).
"""
import json
import logging

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


def call_admin(endpoint: str, fn) -> http.Response:
    """Entry point for all admin API routes."""
    if not _validate_api_key():
        return json_error('Unauthorized', 401, 'UNAUTHORIZED')
    try:
        result = fn()
        return json_ok(result)
    except EssLicenseError as exc:
        return json_error(str(exc).strip(), 400, exc.code)
    except (UserError, ValidationError) as exc:
        return json_error(str(exc).strip(), 400, 'VALIDATION_ERROR')
    except Exception as exc:
        _logger.error('ESS Admin API [%s]: %s', endpoint, exc, exc_info=True)
        return json_error('An unexpected error occurred.', 500, 'SERVER_ERROR')
