from odoo import http
from odoo.http import request

from .utils import call_and_log, get_body, get_auth_context


class AdvanceSalaryController(http.Controller):

    @http.route('/ess/api/advance-salary/info', type='http', auth='none', methods=['GET', 'POST'], csrf=False, readonly=False)
    def info(self):
        kw = get_body()
        employee_id = kw.get('employee_id') or get_auth_context().get('employee_id')
        return call_and_log(
            '/ess/api/advance-salary/info',
            lambda: request.env['hr.advance.salary'].sudo().get_advance_salary_cap(employee_id),
        )

    @http.route('/ess/api/advance-salary', type='http', auth='none', methods=['GET', 'POST'], csrf=False, readonly=False)
    def advances(self):
        kw = get_body()
        employee_id = kw.get('employee_id') or get_auth_context().get('employee_id')
        if request.httprequest.method == 'GET':
            return call_and_log(
                '/ess/api/advance-salary',
                lambda: request.env['hr.advance.salary'].sudo().get_advance_salaries(employee_id),
            )
        return call_and_log(
            '/ess/api/advance-salary',
            lambda: request.env['hr.advance.salary'].sudo().create_advance_salary(
                employee_id, kw.get('advance_amount') or kw.get('amount'),
            ),
        )

    @http.route('/ess/api/advance-salary/<int:advance_id>', type='http', auth='none', methods=['GET'], csrf=False, readonly=False)
    def advance_by_id(self, advance_id):
        return call_and_log(
            '/ess/api/advance-salary/<id>',
            lambda: request.env['hr.advance.salary'].sudo().get_advance_salary_detail(advance_id),
        )

    @http.route('/ess/api/advance-salary/approve', type='http', auth='none', methods=['POST'], csrf=False, readonly=False)
    def approve(self):
        kw = get_body()
        record_id = kw.get('advance_id') or kw.get('request_id') or kw.get('record_id')
        manager_employee_id = kw.get('manager_employee_id') or get_auth_context().get('employee_id')
        return call_and_log(
            '/ess/api/advance-salary/approve',
            lambda: request.env['hr.advance.salary'].sudo().approve_advance_salary(
                record_id, manager_employee_id,
            ),
        )

    @http.route('/ess/api/advance-salary/refuse', type='http', auth='none', methods=['POST'], csrf=False, readonly=False)
    def refuse(self):
        kw = get_body()
        record_id = kw.get('advance_id') or kw.get('request_id') or kw.get('record_id')
        manager_employee_id = kw.get('manager_employee_id') or get_auth_context().get('employee_id')
        return call_and_log(
            '/ess/api/advance-salary/refuse',
            lambda: request.env['hr.advance.salary'].sudo().refuse_advance_salary(
                record_id, manager_employee_id, kw.get('reason', ''),
            ),
        )

    @http.route('/ess/api/advance-salary/reset', type='http', auth='none', methods=['POST'], csrf=False, readonly=False)
    def reset(self):
        kw = get_body()
        record_id = kw.get('advance_id') or kw.get('request_id') or kw.get('record_id')
        return call_and_log(
            '/ess/api/advance-salary/reset',
            lambda: request.env['hr.advance.salary'].sudo().reset_advance_salary(record_id),
        )
