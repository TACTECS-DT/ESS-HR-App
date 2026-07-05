from odoo import http
from odoo.http import request
from odoo.exceptions import UserError

from .utils import call_and_log, get_body, get_auth_context, check_record_access


class AdvanceSalaryController(http.Controller):

    @http.route('/ess/api/advance-salary/info', type='http', auth='none', methods=['GET', 'POST'], csrf=False, readonly=False)
    def info(self):
        employee_id = get_auth_context().get('employee_id')
        return call_and_log(
            '/ess/api/advance-salary/info',
            lambda: request.env['hr.advance.salary'].sudo().get_advance_salary_cap(employee_id),
        )

    @http.route('/ess/api/advance-salary', type='http', auth='none', methods=['GET', 'POST'], csrf=False, readonly=False)
    def advances(self):
        kw = get_body()
        employee_id = get_auth_context().get('employee_id')
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
        acting_employee_id = get_auth_context().get('employee_id')
        def _do():
            record = request.env['hr.advance.salary'].sudo().browse(advance_id)
            if not record.exists():
                raise UserError('Advance salary request not found.')
            check_record_access(request.env, acting_employee_id, record.employee_id.id)
            return request.env['hr.advance.salary'].sudo().get_advance_salary_detail(advance_id)
        return call_and_log('/ess/api/advance-salary/<id>', _do)

    @http.route('/ess/api/advance-salary/approve', type='http', auth='none', methods=['POST'], csrf=False, readonly=False)
    def approve(self):
        kw = get_body()
        manager_employee_id = get_auth_context().get('employee_id')
        record_id = kw.get('advance_id') or kw.get('request_id') or kw.get('record_id')
        return call_and_log(
            '/ess/api/advance-salary/approve',
            lambda: request.env['hr.advance.salary'].sudo().approve_advance_salary(
                record_id, manager_employee_id,
            ),
        )

    @http.route('/ess/api/advance-salary/refuse', type='http', auth='none', methods=['POST'], csrf=False, readonly=False)
    def refuse(self):
        kw = get_body()
        manager_employee_id = get_auth_context().get('employee_id')
        record_id = kw.get('advance_id') or kw.get('request_id') or kw.get('record_id')
        return call_and_log(
            '/ess/api/advance-salary/refuse',
            lambda: request.env['hr.advance.salary'].sudo().refuse_advance_salary(
                record_id, manager_employee_id, kw.get('reason', ''),
            ),
        )

    @http.route('/ess/api/advance-salary/reset', type='http', auth='none', methods=['POST'], csrf=False, readonly=False)
    def reset(self):
        kw = get_body()
        acting_employee_id = get_auth_context().get('employee_id')
        def _do():
            record_id = kw.get('advance_id') or kw.get('request_id') or kw.get('record_id')
            record = request.env['hr.advance.salary'].sudo().browse(record_id)
            if not record.exists():
                raise UserError('Advance salary request not found.')
            check_record_access(request.env, acting_employee_id, record.employee_id.id)
            return request.env['hr.advance.salary'].sudo().reset_advance_salary(record_id)
        return call_and_log('/ess/api/advance-salary/reset', _do)
