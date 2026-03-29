from odoo import http
from odoo.http import request

from .utils import call_and_log, get_body


class AuthController(http.Controller):

    @http.route('/ess/api/auth/login', type='http', auth='none', methods=['POST'], csrf=False)
    def login(self):
        kw = get_body()
        company_id = kw.get('company_id')

        if kw.get('badge_id'):
            # Badge ID + PIN mode
            return call_and_log(
                '/ess/api/auth/login',
                lambda: request.env['hr.employee'].sudo().authenticate_badge_pin(
                    kw.get('badge_id'), kw.get('pin'), company_id,
                ),
            )
        elif kw.get('username'):
            # Username + Password mode
            return call_and_log(
                '/ess/api/auth/login',
                lambda: request.env['hr.employee'].sudo().authenticate_username_password(
                    kw.get('username'), kw.get('password'), company_id,
                ),
            )
        else:
            from .utils import json_error
            return json_error('Either badge_id or username is required.', 400)

    @http.route('/ess/api/auth/reset-pin', type='http', auth='none', methods=['POST'], csrf=False)
    def reset_pin(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/auth/reset-pin',
            lambda: request.env['hr.employee'].sudo().reset_mobile_pin(employee_id, kw.get('new_pin')),
        )

    @http.route('/ess/api/auth/refresh', type='http', auth='none', methods=['POST'], csrf=False)
    def refresh(self):
        # Direct Odoo mode is stateless — tokens are regenerated on next login
        return call_and_log('/ess/api/auth/refresh', lambda: {'refreshed': True})

    @http.route('/ess/api/auth/logout', type='http', auth='none', methods=['POST'], csrf=False)
    def logout(self):
        # Direct Odoo mode is stateless — nothing to invalidate
        return call_and_log('/ess/api/auth/logout', lambda: {'logged_out': True})

    @http.route('/ess/api/auth/by-user', type='http', auth='none', methods=['GET', 'POST'], csrf=False)
    def by_user(self):
        kw = get_body()
        odoo_user_id = kw.get('user_id')
        return call_and_log(
            '/ess/api/auth/by-user',
            lambda: request.env['hr.employee'].sudo().get_employee_by_user(odoo_user_id),
        )
