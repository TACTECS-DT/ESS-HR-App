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

    @http.route('/ess/api/auth/refresh', type='http', auth='none', methods=['POST'], csrf=False)
    def refresh(self):
        return call_and_log('/ess/api/auth/refresh', lambda: {'refreshed': True})

    @http.route('/ess/api/auth/logout', type='http', auth='none', methods=['POST'], csrf=False)
    def logout(self):
        return call_and_log('/ess/api/auth/logout', lambda: {'logged_out': True})

    @http.route('/ess/api/auth/by-user', type='http', auth='none', methods=['GET', 'POST'], csrf=False)
    def by_user(self):
        kw = get_body()
        odoo_user_id = kw.get('user_id')
        return call_and_log(
            '/ess/api/auth/by-user',
            lambda: request.env['hr.employee'].sudo().get_employee_by_user(odoo_user_id),
        )

    @http.route('/ess/api/auth/companies', type='http', auth='none', methods=['GET'], csrf=False)
    def companies(self):
        """
        Return all active companies on this client server.
        Called by the mobile app after Step 1 (admin validate) to populate
        the company selection screen.
        """
        def _get_companies():
            companies = request.env['res.company'].sudo().search([('active', '=', True)], order='name asc')
            return [
                {
                    'id': c.id,
                    'name': c.name,
                    'name_ar': c.name,   # extend when Arabic company name field exists
                }
                for c in companies
            ]
        return call_and_log('/ess/api/auth/companies', _get_companies)
