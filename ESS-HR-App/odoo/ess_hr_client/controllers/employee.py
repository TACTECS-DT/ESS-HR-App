from odoo import http
from odoo.http import request

from .utils import call_and_log, get_body, get_auth_context


class EmployeeController(http.Controller):

    @http.route('/ess/api/profile', type='http', auth='none', methods=['GET', 'POST'], csrf=False, readonly=False)
    def profile(self):
        kw = get_body()
        employee_id = kw.get('employee_id') or get_auth_context().get('employee_id')
        return call_and_log(
            '/ess/api/profile',
            lambda: request.env['hr.employee'].sudo().get_employee_profile(employee_id),
        )

    @http.route('/ess/api/profile/contract', type='http', auth='none', methods=['GET', 'POST'], csrf=False, readonly=False)
    def contract(self):
        kw = get_body()
        employee_id = kw.get('employee_id') or get_auth_context().get('employee_id')
        return call_and_log(
            '/ess/api/profile/contract',
            lambda: request.env['hr.employee'].sudo().get_contract_summary(employee_id),
        )

    @http.route('/ess/api/employees', type='http', auth='none', methods=['GET', 'POST'], csrf=False, readonly=False)
    def directory(self):
        kw = get_body()
        ctx = get_auth_context()
        company_id = kw.get('company_id') or ctx.get('company_id')
        return call_and_log(
            '/ess/api/employees',
            lambda: request.env['hr.employee'].sudo().get_employee_directory(
                company_id, kw.get('search'),
            ),
        )
