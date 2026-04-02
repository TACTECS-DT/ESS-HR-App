"""
Mobile login Step 1 validation endpoint.

Mobile app calls POST /ess/admin/api/validate with { server_url: "..." }.

Response on success:
  {
    success: true,
    data: {
      status: "valid",
      allowed_modules: [{ name, code }, ...],
      auto_logout_duration: 72
    }
  }

Response on failure:
  {
    success: false,
    error: { code, message, message_ar }
  }

Codes:
  SERVER_NOT_FOUND   — server_url not registered in admin
  LICENSE_INACTIVE   — license exists but is deactivated
  LICENSE_EXPIRED    — license has passed expiry date
  EMPLOYEE_LIMIT     — employee count exceeds the allowed limit
"""
from odoo import http
from odoo.http import request

from .utils import call_admin, get_body


class ValidateController(http.Controller):

    @http.route('/ess/admin/api/validate', type='http', auth='none', methods=['POST'], csrf=False, readonly=False)
    def validate(self):
        kw = get_body()
        return call_admin(
            '/ess/admin/api/validate',
            lambda: request.env['ess.license'].sudo().validate_for_mobile(
                kw.get('server_url'),
            ),
        )
