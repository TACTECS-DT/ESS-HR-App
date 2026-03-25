from odoo import http
from odoo.http import request

from .utils import call_and_log, get_body


class AuthController(http.Controller):

    @http.route('/ess/api/auth/badge-pin', type='http', auth='none', methods=['POST'], csrf=False)
    def badge_pin(self):
        kw = get_body()
        # employee_id unknown before auth — logged without attribution
        return call_and_log(
            '/ess/api/auth/badge-pin', None,
            lambda: request.env['hr.employee'].sudo().authenticate_badge_pin(
                kw.get('badge_id'), kw.get('pin'), kw.get('company_id'),
            ),
        )

    @http.route('/ess/api/auth/by-user', type='http', auth='none', methods=['POST'], csrf=False)
    def by_user(self):
        kw = get_body()
        return call_and_log(
            '/ess/api/auth/by-user', None,
            lambda: request.env['hr.employee'].sudo().get_employee_by_odoo_user(kw.get('odoo_uid')),
        )

    @http.route('/ess/api/auth/reset-pin', type='http', auth='none', methods=['POST'], csrf=False)
    def reset_pin(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/auth/reset-pin', employee_id,
            lambda: request.env['hr.employee'].sudo().reset_mobile_pin(employee_id, kw.get('new_pin')),
        )
