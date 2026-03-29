from datetime import datetime
from odoo import models, fields, api, _
from odoo.exceptions import UserError, ValidationError


class HrLeaveTypeExt(models.Model):
    _name = 'hr.leave.type'
    _inherit = ['hr.leave.type', 'ess.mixin']

    mobile_require_attachment = fields.Boolean(string='Require Attachment on Mobile', default=False)
    mobile_require_description = fields.Boolean(string='Require Description on Mobile', default=False)

    @api.model
    def get_leave_types(self, company_id):
        """Return list of available leave type dicts for the given company."""
        domain = [('active', '=', True)]
        if company_id:
            domain.append(('company_id', 'in', [company_id, False]))
        leave_types = self.sudo().search(domain)
        result = []
        for lt in leave_types:
            result.append({
                'id': lt.id,
                'name': lt.name,
                'requires_allocation': lt.requires_allocation,
                'leave_validation_type': lt.leave_validation_type,
                'mobile_require_attachment': lt.mobile_require_attachment,
                'mobile_require_description': lt.mobile_require_description,
                'max_leaves': lt.max_leaves,
                'leaves_taken': lt.leaves_taken,
                'remaining_leaves': lt.virtual_remaining_leaves,
            })
        return result


class HrLeaveExt(models.Model):
    _name = 'hr.leave'
    _inherit = ['hr.leave', 'ess.mixin']

    @api.model
    def get_leave_balance(self, employee_id):
        """Return leave balance list per leave type for the employee."""
        employee = self._get_employee(employee_id)
        leave_types = self.env['hr.leave.type'].sudo().search([('active', '=', True)])
        result = []
        for lt in leave_types:
            lt_with_context = lt.with_context(employee_id=employee_id)
            result.append({
                'leave_type_id': lt.id,
                'leave_type_name': lt.name,
                'max_leaves': lt_with_context.max_leaves,
                'leaves_taken': lt_with_context.leaves_taken,
                'remaining_leaves': lt_with_context.virtual_remaining_leaves,
                'requires_allocation': lt.requires_allocation,
            })
        return result

    @api.model
    def create_leave_request(self, employee_id, leave_type_id, date_from, date_to,
                             half_day=False, am_pm='morning', description=''):
        """Create a new leave request and return the leave dict."""
        self._validate_leave_dates(date_from, date_to)
        employee = self._get_employee(employee_id)
        leave_type = self.env['hr.leave.type'].sudo().browse(leave_type_id)
        if not leave_type.exists():
            raise UserError(_('Leave type not found.'))
        date_from_dt = datetime.strptime(date_from + ' 00:00:00', '%Y-%m-%d %H:%M:%S')
        date_to_dt = datetime.strptime(date_to + ' 23:59:59', '%Y-%m-%d %H:%M:%S')
        if half_day:
            if am_pm == 'morning':
                date_from_dt = datetime.strptime(date_from + ' 08:00:00', '%Y-%m-%d %H:%M:%S')
                date_to_dt = datetime.strptime(date_from + ' 13:00:00', '%Y-%m-%d %H:%M:%S')
            else:
                date_from_dt = datetime.strptime(date_from + ' 13:00:00', '%Y-%m-%d %H:%M:%S')
                date_to_dt = datetime.strptime(date_from + ' 18:00:00', '%Y-%m-%d %H:%M:%S')
        vals = {
            'employee_id': employee_id,
            'holiday_status_id': leave_type_id,
            'date_from': date_from_dt,
            'date_to': date_to_dt,
            'name': description or '/',
        }
        leave = self._env_for_write(employee).with_context(mail_notify_force_send=False).create(vals)
        return self._format_leave_record(leave)

    @api.model
    def get_leave_requests(self, employee_id, state_filter=None):
        """Return list of leave requests for the employee, optionally filtered by state."""
        domain = [('employee_id', '=', employee_id)]
        if state_filter:
            domain.append(('state', '=', state_filter))
        leaves = self.sudo().search(domain, order='date_from desc')
        return [self._format_leave_record(l) for l in leaves]

    @api.model
    def get_leave_request_detail(self, leave_id):
        """Return a full leave request dict including approval history."""
        leave = self.sudo().browse(leave_id)
        if not leave.exists():
            raise UserError(_('Leave request not found.'))
        result = self._format_leave_record(leave)
        result['approval_history'] = self._get_approval_history(leave)
        return result

    @api.model
    def update_leave_request(self, leave_id, vals):
        """Update a pending leave request (description/dates). Returns updated dict."""
        leave = self.sudo().browse(leave_id)
        if not leave.exists():
            raise UserError(_('Leave request not found.'))
        if leave.state not in ('confirm',):
            raise UserError(_('Only pending leave requests can be updated.'))
        employee = leave.employee_id
        allowed = ['name']
        write_vals = {k: v for k, v in vals.items() if k in allowed}
        if write_vals:
            self._env_for_write(employee).browse(leave.id).write(write_vals)
        return self._format_leave_record(leave)

    @api.model
    def cancel_leave_request(self, leave_id):
        """Cancel a leave request (refuse if approved, delete if in confirm). Returns True."""
        leave = self.sudo().browse(leave_id)
        if not leave.exists():
            raise UserError(_('Leave request not found.'))
        if leave.state in ('confirm', 'validate1'):
            leave.sudo().action_refuse()
        elif leave.state == 'validate':
            leave.sudo().action_refuse()
        elif leave.state == 'refuse':
            pass  # already refused
        else:
            raise UserError(_('Cannot cancel a leave in state: %s') % leave.state)
        return True

    @api.model
    def approve_leave(self, leave_id, manager_employee_id):
        """First-level approval of a leave request. Returns True."""
        leave = self.sudo().browse(leave_id)
        if not leave.exists():
            raise UserError(_('Leave request not found.'))
        manager = self._get_employee(manager_employee_id)
        if manager.user_id:
            leave.with_user(manager.user_id).action_approve()
        else:
            leave.sudo().action_approve()
        return True

    @api.model
    def refuse_leave(self, leave_id, manager_employee_id, reason):
        """Refuse a leave request with a given reason. Returns True."""
        leave = self.sudo().browse(leave_id)
        if not leave.exists():
            raise UserError(_('Leave request not found.'))
        manager = self._get_employee(manager_employee_id)
        if manager.user_id:
            leave.with_user(manager.user_id).action_refuse()
        else:
            leave.sudo().action_refuse()
        if reason:
            leave.sudo().write({'name': (leave.name or '') + ' [Refused: %s]' % reason})
        return True

    @api.model
    def validate_leave(self, leave_id, hr_employee_id):
        """Second-level / HR validation of a leave request. Returns True.

        In Odoo 19 the public action is action_approve() for both approval levels.
        """
        leave = self.sudo().browse(leave_id)
        if not leave.exists():
            raise UserError(_('Leave request not found.'))
        hr_employee = self._get_employee(hr_employee_id)
        if hr_employee.user_id:
            leave.with_user(hr_employee.user_id).action_approve()
        else:
            leave.sudo().action_approve()
        return True

    @api.model
    def reset_leave_to_draft(self, leave_id):
        """Reset a leave request to pending-approval (confirm) state. Returns True.

        Odoo 19 removed the 'draft' state; the initial/reset state is 'confirm'.
        """
        leave = self.sudo().browse(leave_id)
        if not leave.exists():
            raise UserError(_('Leave request not found.'))
        leave.sudo().write({'state': 'confirm'})
        return True

    @api.model
    def get_team_leave_allocations(self, manager_employee_id):
        """Return leave balance dicts for all employees reporting to the manager."""
        manager = self._get_employee(manager_employee_id)
        team_members = self.env['hr.employee'].sudo().search([
            ('parent_id', '=', manager_employee_id),
        ])
        leave_types = self.env['hr.leave.type'].sudo().search([('active', '=', True)])
        result = []
        for emp in team_members:
            emp_balances = []
            for lt in leave_types:
                lt_ctx = lt.with_context(employee_id=emp.id)
                emp_balances.append({
                    'leave_type_id': lt.id,
                    'leave_type_name': lt.name,
                    'max_leaves': lt_ctx.max_leaves,
                    'leaves_taken': lt_ctx.leaves_taken,
                    'remaining_leaves': lt_ctx.virtual_remaining_leaves,
                })
            result.append({
                'employee_id': emp.id,
                'employee_name': emp.name,
                'balances': emp_balances,
            })
        return result

    def _get_approval_history(self, leave):
        """Build approval step list from a leave record's message history."""
        history = []
        try:
            for msg in leave.message_ids.sorted('date'):
                if msg.subtype_id and msg.subtype_id.name in ('Leave Approved', 'Leave Refused', 'Leave Validated'):
                    history.append({
                        'date': msg.date.strftime('%Y-%m-%d %H:%M:%S') if msg.date else False,
                        'author': msg.author_id.name if msg.author_id else '',
                        'action': msg.subtype_id.name,
                        'body': msg.body or '',
                    })
        except Exception:
            pass
        return history

    def _format_leave_record(self, leave):
        """Format an hr.leave record into a plain dict."""
        return {
            'id': leave.id,
            'employee_id': leave.employee_id.id,
            'employee_name': leave.employee_id.name,
            'leave_type_id': leave.holiday_status_id.id,
            'leave_type_name': leave.holiday_status_id.name,
            'date_from': leave.date_from.strftime('%Y-%m-%d %H:%M:%S') if leave.date_from else False,
            'date_to': leave.date_to.strftime('%Y-%m-%d %H:%M:%S') if leave.date_to else False,
            'number_of_days': leave.number_of_days,
            'state': leave.state,
            'name': leave.name or '',
            'description': leave.name or '',
        }

    def _validate_leave_dates(self, date_from, date_to):
        """Raise ValidationError if leave dates are invalid."""
        if not date_from or not date_to:
            raise ValidationError(_('Leave start and end dates are required.'))
        try:
            d_from = datetime.strptime(date_from, '%Y-%m-%d').date()
            d_to = datetime.strptime(date_to, '%Y-%m-%d').date()
        except ValueError:
            raise ValidationError(_('Invalid date format. Use YYYY-MM-DD.'))
        if d_from > d_to:
            raise ValidationError(_('Leave start date must be before or equal to end date.'))
