from odoo import http
from odoo.http import request

from .utils import call_and_log, get_body


class AdvanceSalaryController(http.Controller):

    @http.route('/ess/api/advance-salary/info', type='http', auth='none', methods=['GET', 'POST'], csrf=False)
    def info(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/advance-salary/info', employee_id,
            lambda: request.env['hr.advance.salary'].sudo().get_advance_salary_cap(employee_id),
        )

    @http.route('/ess/api/advance-salary', type='http', auth='none', methods=['GET', 'POST'], csrf=False)
    def advances(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        if request.httprequest.method == 'GET':
            return call_and_log(
                '/ess/api/advance-salary', employee_id,
                lambda: request.env['hr.advance.salary'].sudo().get_advance_salaries(employee_id),
            )
        return call_and_log(
            '/ess/api/advance-salary', employee_id,
            lambda: request.env['hr.advance.salary'].sudo().create_advance_salary(
                employee_id, kw.get('amount'),
            ),
        )

    @http.route('/ess/api/advance-salary/<int:advance_id>', type='http', auth='none', methods=['GET'], csrf=False)
    def advance_by_id(self, advance_id):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/advance-salary/<id>', employee_id,
            lambda: request.env['hr.advance.salary'].sudo().get_advance_salary_detail(advance_id),
        )

    @http.route('/ess/api/advance-salary/approve', type='http', auth='none', methods=['POST'], csrf=False)
    def approve(self):
        kw = get_body()
        manager_employee_id = kw.get('manager_employee_id')
        return call_and_log(
            '/ess/api/advance-salary/approve', manager_employee_id,
            lambda: request.env['hr.advance.salary'].sudo().approve_advance_salary(
                kw.get('request_id'), manager_employee_id,
            ),
        )

    @http.route('/ess/api/advance-salary/refuse', type='http', auth='none', methods=['POST'], csrf=False)
    def refuse(self):
        kw = get_body()
        manager_employee_id = kw.get('manager_employee_id')
        return call_and_log(
            '/ess/api/advance-salary/refuse', manager_employee_id,
            lambda: request.env['hr.advance.salary'].sudo().refuse_advance_salary(
                kw.get('request_id'), manager_employee_id, kw.get('reason', ''),
            ),
        )

    @http.route('/ess/api/advance-salary/reset', type='http', auth='none', methods=['POST'], csrf=False)
    def reset(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/advance-salary/reset', employee_id,
            lambda: request.env['hr.advance.salary'].sudo().reset_advance_salary(kw.get('request_id')),
        )
