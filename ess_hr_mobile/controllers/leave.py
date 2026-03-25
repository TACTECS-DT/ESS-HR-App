from odoo import http
from odoo.http import request

from .utils import call_and_log, get_body


class LeaveController(http.Controller):

    @http.route('/ess/api/leave/types', type='http', auth='none', methods=['POST'], csrf=False)
    def types(self):
        kw = get_body()
        return call_and_log(
            '/ess/api/leave/types', None,
            lambda: request.env['hr.leave.type'].sudo().get_leave_types(kw.get('company_id')),
        )

    @http.route('/ess/api/leave/balance', type='http', auth='none', methods=['POST'], csrf=False)
    def balance(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/leave/balance', employee_id,
            lambda: request.env['hr.leave'].sudo().get_leave_balance(employee_id),
        )

    @http.route('/ess/api/leave/create', type='http', auth='none', methods=['POST'], csrf=False)
    def create(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/leave/create', employee_id,
            lambda: request.env['hr.leave'].sudo().create_leave_request(
                employee_id,
                kw.get('leave_type_id'),
                kw.get('date_from'),
                kw.get('date_to'),
                kw.get('half_day', False),
                kw.get('am_pm', 'morning'),
                kw.get('description', ''),
            ),
        )

    @http.route('/ess/api/leave/list', type='http', auth='none', methods=['POST'], csrf=False)
    def list(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/leave/list', employee_id,
            lambda: request.env['hr.leave'].sudo().get_leave_requests(employee_id, kw.get('state_filter')),
        )

    @http.route('/ess/api/leave/detail', type='http', auth='none', methods=['POST'], csrf=False)
    def detail(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/leave/detail', employee_id,
            lambda: request.env['hr.leave'].sudo().get_leave_request_detail(kw.get('leave_id')),
        )

    @http.route('/ess/api/leave/approve', type='http', auth='none', methods=['POST'], csrf=False)
    def approve(self):
        kw = get_body()
        manager_employee_id = kw.get('manager_employee_id')
        return call_and_log(
            '/ess/api/leave/approve', manager_employee_id,
            lambda: request.env['hr.leave'].sudo().approve_leave(kw.get('leave_id'), manager_employee_id),
        )

    @http.route('/ess/api/leave/refuse', type='http', auth='none', methods=['POST'], csrf=False)
    def refuse(self):
        kw = get_body()
        manager_employee_id = kw.get('manager_employee_id')
        return call_and_log(
            '/ess/api/leave/refuse', manager_employee_id,
            lambda: request.env['hr.leave'].sudo().refuse_leave(
                kw.get('leave_id'), manager_employee_id, kw.get('reason', ''),
            ),
        )

    @http.route('/ess/api/leave/validate', type='http', auth='none', methods=['POST'], csrf=False)
    def validate(self):
        kw = get_body()
        hr_employee_id = kw.get('hr_employee_id')
        return call_and_log(
            '/ess/api/leave/validate', hr_employee_id,
            lambda: request.env['hr.leave'].sudo().validate_leave(kw.get('leave_id'), hr_employee_id),
        )

    @http.route('/ess/api/leave/reset', type='http', auth='none', methods=['POST'], csrf=False)
    def reset(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/leave/reset', employee_id,
            lambda: request.env['hr.leave'].sudo().reset_leave_to_draft(kw.get('leave_id')),
        )

    @http.route('/ess/api/leave/team-allocations', type='http', auth='none', methods=['POST'], csrf=False)
    def team_allocations(self):
        kw = get_body()
        manager_employee_id = kw.get('manager_employee_id')
        return call_and_log(
            '/ess/api/leave/team-allocations', manager_employee_id,
            lambda: request.env['hr.leave'].sudo().get_team_leave_allocations(manager_employee_id),
        )
