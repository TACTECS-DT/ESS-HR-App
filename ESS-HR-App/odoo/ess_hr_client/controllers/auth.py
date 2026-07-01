from odoo import http
from odoo.http import request

from .utils import call_and_log, get_body, get_auth_context, require_hr_or_admin


class AuthController(http.Controller):

    @http.route('/ess/api/auth/login', type='http', auth='none', methods=['POST'], csrf=False, readonly=False)
    def login(self):
        kw = get_body()
        company_id = kw.get('company_id')

        def _with_gen(result):
            gen = int(
                request.env['ir.config_parameter'].sudo()
                .get_param('ess.force_logout.generation', '0') or '0'
            )
            result['force_logout_gen'] = gen
            return result

        if kw.get('badge_id'):
            return call_and_log(
                '/ess/api/auth/login',
                lambda: _with_gen(request.env['hr.employee'].sudo().authenticate_badge_pin(
                    kw.get('badge_id'), kw.get('pin'), company_id,
                )),
            )
        elif kw.get('username'):
            return call_and_log(
                '/ess/api/auth/login',
                lambda: _with_gen(request.env['hr.employee'].sudo().authenticate_username_password(
                    kw.get('username'), kw.get('password'), company_id,
                )),
            )
        else:
            from .utils import json_error
            return json_error('Either badge_id or username is required.', 400)

    @http.route('/ess/api/auth/refresh', type='http', auth='none', methods=['POST'], csrf=False, readonly=False)
    def refresh(self):
        return call_and_log('/ess/api/auth/refresh', lambda: {'refreshed': True})

    @http.route('/ess/api/auth/logout', type='http', auth='none', methods=['POST'], csrf=False, readonly=False)
    def logout(self):
        return call_and_log('/ess/api/auth/logout', lambda: {'logged_out': True})

    @http.route('/ess/api/auth/by-user', type='http', auth='none', methods=['GET', 'POST'], csrf=False, readonly=False)
    def by_user(self):
        kw = get_body()
        acting_employee_id = get_auth_context().get('employee_id')
        odoo_user_id = kw.get('user_id')
        def _do():
            require_hr_or_admin(request.env, acting_employee_id)
            return request.env['hr.employee'].sudo().get_employee_by_user(odoo_user_id)
        return call_and_log('/ess/api/auth/by-user', _do)

    @http.route('/ess/api/auth/companies', type='http', auth='none', methods=['GET'], csrf=False, readonly=False)
    def companies(self):
        def _get_companies():
            companies = request.env['res.company'].sudo().search([('active', '=', True)], order='name asc')
            return [
                {
                    'id': c.id,
                    'name': c.name,
                    'name_ar': c.name,
                }
                for c in companies
            ]
        return call_and_log('/ess/api/auth/companies', _get_companies)
