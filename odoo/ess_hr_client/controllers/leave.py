from odoo import http
from odoo.http import request

from .utils import call_and_log, get_body, get_auth_context


class LeaveController(http.Controller):

    @http.route('/ess/api/leave/types', type='http', auth='none', methods=['GET', 'POST'], csrf=False)
    def types(self):
        kw = get_body()
        return call_and_log(
            '/ess/api/leave/types',
            lambda: request.env['hr.leave.type'].sudo().get_leave_types(kw.get('company_id')),
        )

    @http.route('/ess/api/leave/balances', type='http', auth='none', methods=['GET', 'POST'], csrf=False)
    def balances(self):
        kw = get_body()
        employee_id = kw.get('employee_id') or get_auth_context().get('employee_id')
        return call_and_log(
            '/ess/api/leave/balances',
            lambda: request.env['hr.leave'].sudo().get_leave_balance(employee_id),
        )

    @http.route('/ess/api/leave/team-balances', type='http', auth='none', methods=['GET', 'POST'], csrf=False)
    def team_balances(self):
        kw = get_body()
        manager_employee_id = kw.get('manager_employee_id') or get_auth_context().get('employee_id')
        return call_and_log(
            '/ess/api/leave/team-balances',
            lambda: request.env['hr.leave'].sudo().get_team_leave_allocations(manager_employee_id),
        )

    @http.route('/ess/api/leave/requests', type='http', auth='none', methods=['GET', 'POST'], csrf=False)
    def requests(self):
        kw = get_body()
        employee_id = kw.get('employee_id') or get_auth_context().get('employee_id')
        if request.httprequest.method == 'GET':
            return call_and_log(
                '/ess/api/leave/requests',
                lambda: request.env['hr.leave'].sudo().get_leave_requests(employee_id, kw.get('state_filter')),
            )
        return call_and_log(
            '/ess/api/leave/requests',
            lambda: request.env['hr.leave'].sudo().create_leave_request(
                employee_id,
                kw.get('leave_type_id') or kw.get('holiday_status_id'),
                kw.get('date_from'),
                kw.get('date_to'),
                kw.get('half_day', False),
                kw.get('am_pm', 'morning'),
                kw.get('description', '') or kw.get('name', ''),
            ),
        )

    @http.route('/ess/api/leave/requests/<int:leave_id>', type='http', auth='none', methods=['GET', 'PATCH', 'DELETE'], csrf=False)
    def request_by_id(self, leave_id):
        kw = get_body()
        method = request.httprequest.method
        if method == 'GET':
            return call_and_log(
                '/ess/api/leave/requests/<id>',
                lambda: request.env['hr.leave'].sudo().get_leave_request_detail(leave_id),
            )
        if method == 'PATCH':
            return call_and_log(
                '/ess/api/leave/requests/<id>',
                lambda: request.env['hr.leave'].sudo().update_leave_request(
                    leave_id, kw.get('vals', {}),
                ),
            )
        return call_and_log(
            '/ess/api/leave/requests/<id>',
            lambda: request.env['hr.leave'].sudo().cancel_leave_request(leave_id),
        )

    @http.route('/ess/api/leave/approve', type='http', auth='none', methods=['POST'], csrf=False)
    def approve(self):
        kw = get_body()
        manager_employee_id = kw.get('manager_employee_id') or get_auth_context().get('employee_id')
        return call_and_log(
            '/ess/api/leave/approve',
            lambda: request.env['hr.leave'].sudo().approve_leave(kw.get('leave_id'), manager_employee_id),
        )

    @http.route('/ess/api/leave/refuse', type='http', auth='none', methods=['POST'], csrf=False)
    def refuse(self):
        kw = get_body()
        manager_employee_id = kw.get('manager_employee_id') or get_auth_context().get('employee_id')
        return call_and_log(
            '/ess/api/leave/refuse',
            lambda: request.env['hr.leave'].sudo().refuse_leave(
                kw.get('leave_id'), manager_employee_id, kw.get('reason', ''),
            ),
        )

    @http.route('/ess/api/leave/validate', type='http', auth='none', methods=['POST'], csrf=False)
    def validate(self):
        kw = get_body()
        hr_employee_id = kw.get('hr_employee_id') or get_auth_context().get('employee_id')
        return call_and_log(
            '/ess/api/leave/validate',
            lambda: request.env['hr.leave'].sudo().validate_leave(kw.get('leave_id'), hr_employee_id),
        )

    @http.route('/ess/api/leave/reset', type='http', auth='none', methods=['POST'], csrf=False)
    def reset(self):
        kw = get_body()
        return call_and_log(
            '/ess/api/leave/reset',
            lambda: request.env['hr.leave'].sudo().reset_leave_to_draft(kw.get('leave_id')),
        )
