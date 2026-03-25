from odoo import http
from odoo.http import request

from .utils import call_and_log, get_body


class EmployeeController(http.Controller):

    @http.route('/ess/api/employee/profile', type='http', auth='none', methods=['POST'], csrf=False)
    def profile(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/employee/profile', employee_id,
            lambda: request.env['hr.employee'].sudo().get_employee_profile(employee_id),
        )

    @http.route('/ess/api/employee/contract', type='http', auth='none', methods=['POST'], csrf=False)
    def contract(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/employee/contract', employee_id,
            lambda: request.env['hr.employee'].sudo().get_contract_summary(employee_id),
        )
