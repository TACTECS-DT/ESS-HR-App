from odoo import http
from odoo.http import request
from odoo.exceptions import UserError

from .utils import call_and_log, get_body, get_auth_context, check_record_access


class LeaveController(http.Controller):

    @http.route('/ess/api/leave/types', type='http', auth='none', methods=['GET', 'POST'], csrf=False, readonly=False)
    def types(self):
        ctx = get_auth_context()
        employee_id = ctx.get('employee_id')
        return call_and_log(
            '/ess/api/leave/types',
            lambda: request.env['hr.leave.type'].sudo().get_leave_types(employee_id),
        )

    @http.route('/ess/api/leave/balances', type='http', auth='none', methods=['GET', 'POST'], csrf=False, readonly=False)
    def balances(self):
        employee_id = get_auth_context().get('employee_id')
        return call_and_log(
            '/ess/api/leave/balances',
            lambda: request.env['hr.leave'].sudo().get_leave_balance(employee_id),
        )

    @http.route('/ess/api/leave/team-balances', type='http', auth='none', methods=['GET', 'POST'], csrf=False, readonly=False)
    def team_balances(self):
        manager_employee_id = get_auth_context().get('employee_id')
        return call_and_log(
            '/ess/api/leave/team-balances',
            lambda: request.env['hr.leave'].sudo().get_team_leave_allocations(manager_employee_id),
        )

    @http.route('/ess/api/leave/requests', type='http', auth='none', methods=['GET', 'POST'], csrf=False, readonly=False)
    def requests(self):
        kw = get_body()
        employee_id = get_auth_context().get('employee_id')
        if request.httprequest.method == 'GET':
            return call_and_log(
                '/ess/api/leave/requests',
                lambda: request.env['hr.leave'].sudo().get_leave_requests(
                    employee_id, kw.get('state_filter'), kw.get('scope', 'mine'),
                ),
            )
        mode = kw.get('mode', 'full_day')
        return call_and_log(
            '/ess/api/leave/requests',
            lambda: request.env['hr.leave'].sudo().create_leave_request(
                employee_id,
                kw.get('leave_type_id') or kw.get('holiday_status_id'),
                kw.get('date_from'),
                kw.get('date_to'),
                mode=mode,
                hour_from=kw.get('hour_from'),
                hour_to=kw.get('hour_to'),
                description=kw.get('description', '') or kw.get('name', ''),
            ),
        )

    @http.route('/ess/api/leave/requests/<int:leave_id>', type='http', auth='none', methods=['GET', 'PATCH', 'DELETE'], csrf=False, readonly=False)
    def request_by_id(self, leave_id):
        kw = get_body()
        acting_employee_id = get_auth_context().get('employee_id')
        method = request.httprequest.method

        if method == 'GET':
            def _get():
                record = request.env['hr.leave'].sudo().browse(leave_id)
                if not record.exists():
                    raise UserError('Leave request not found.')
                check_record_access(request.env, acting_employee_id, record.employee_id.id)
                return request.env['hr.leave'].sudo().get_leave_request_detail(leave_id, acting_employee_id)
            return call_and_log('/ess/api/leave/requests/<id>', _get)

        if method == 'PATCH':
            def _patch():
                record = request.env['hr.leave'].sudo().browse(leave_id)
                if not record.exists():
                    raise UserError('Leave request not found.')
                check_record_access(request.env, acting_employee_id, record.employee_id.id, write=True)
                return request.env['hr.leave'].sudo().update_leave_request(leave_id, kw.get('vals', {}))
            return call_and_log('/ess/api/leave/requests/<id>', _patch)

        def _delete():
            record = request.env['hr.leave'].sudo().browse(leave_id)
            if not record.exists():
                raise UserError('Leave request not found.')
            check_record_access(request.env, acting_employee_id, record.employee_id.id, write=True)
            return request.env['hr.leave'].sudo().cancel_leave_request(leave_id)
        return call_and_log('/ess/api/leave/requests/<id>', _delete)

    @http.route('/ess/api/leave/approve', type='http', auth='none', methods=['POST'], csrf=False, readonly=False)
    def approve(self):
        kw = get_body()
        manager_employee_id = get_auth_context().get('employee_id')
        return call_and_log(
            '/ess/api/leave/approve',
            lambda: request.env['hr.leave'].sudo().approve_leave(kw.get('leave_id'), manager_employee_id),
        )

    @http.route('/ess/api/leave/refuse', type='http', auth='none', methods=['POST'], csrf=False, readonly=False)
    def refuse(self):
        kw = get_body()
        manager_employee_id = get_auth_context().get('employee_id')
        return call_and_log(
            '/ess/api/leave/refuse',
            lambda: request.env['hr.leave'].sudo().refuse_leave(
                kw.get('leave_id'), manager_employee_id, kw.get('reason', ''),
            ),
        )

    @http.route('/ess/api/leave/validate', type='http', auth='none', methods=['POST'], csrf=False, readonly=False)
    def validate(self):
        kw = get_body()
        hr_employee_id = get_auth_context().get('employee_id')
        return call_and_log(
            '/ess/api/leave/validate',
            lambda: request.env['hr.leave'].sudo().validate_leave(kw.get('leave_id'), hr_employee_id),
        )

    @http.route('/ess/api/leave/reset', type='http', auth='none', methods=['POST'], csrf=False, readonly=False)
    def reset(self):
        kw = get_body()
        acting_employee_id = get_auth_context().get('employee_id')
        def _do():
            leave_id = kw.get('leave_id')
            record = request.env['hr.leave'].sudo().browse(leave_id)
            if not record.exists():
                raise UserError('Leave request not found.')
            # Managers/HR/Admin can also reset — use read-level check (not write=True)
            check_record_access(request.env, acting_employee_id, record.employee_id.id)
            return request.env['hr.leave'].sudo().reset_leave_to_draft(leave_id)
        return call_and_log('/ess/api/leave/reset', _do)
