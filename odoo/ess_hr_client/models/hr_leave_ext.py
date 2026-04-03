from datetime import datetime
from odoo import models, fields, api, _, SUPERUSER_ID
from odoo.exceptions import UserError, ValidationError

# Odoo state → frontend status
_STATE_TO_STATUS = {
    'draft': 'draft',
    'confirm': 'pending',
    'validate1': 'approved',
    'validate': 'validated',
    'refuse': 'refused',
}


class HrLeaveTypeExt(models.Model):
    _name = 'hr.leave.type'
    _inherit = ['hr.leave.type', 'ess.mixin']

    name_ar = fields.Char(string='Arabic Name')
    mobile_require_attachment = fields.Boolean(string='Require Attachment on Mobile', default=False)
    mobile_require_description = fields.Boolean(string='Require Description on Mobile', default=False)

    @api.model
    def get_leave_types(self, employee_id=None):
        """Return leave types available for the employee to request.

        For types that require allocation: only included when the employee
        has a validated allocation. For no-allocation types: included if
        the employee can request them (employee_requests='yes') within their company.
        """
        # Collect validated allocation type IDs for this employee
        allocated_type_ids = set()
        employee = None
        if employee_id:
            try:
                employee = self._get_employee(employee_id)
                allocations = self.env['hr.leave.allocation'].with_user(SUPERUSER_ID).search([
                    ('employee_id', '=', employee_id),
                    ('state', '=', 'validate'),
                ])
                allocated_type_ids = set(allocations.mapped('holiday_status_id.id'))
            except Exception:
                pass

        company_id = employee.company_id.id if employee and employee.company_id else False
        domain = [('active', '=', True), ('employee_requests', '=', 'yes')]
        if company_id:
            domain.append(('company_id', 'in', [company_id, False]))

        leave_types = self.with_user(SUPERUSER_ID).search(domain)
        result = []
        for lt in leave_types:
            # Only show types for which this employee has a validated allocation
            if employee_id and lt.id not in allocated_type_ids:
                continue

            req_unit = getattr(lt, 'request_unit', 'day')
            result.append({
                'id': lt.id,
                'name': lt.name,
                'name_ar': lt.name_ar or lt.name,
                'requires_attachment': lt.mobile_require_attachment,
                'requires_description': lt.mobile_require_description,
                'allows_half_day': req_unit == 'half_day',
                'allows_hourly': req_unit == 'hour',
            })
        return result


class HrLeaveExt(models.Model):
    _name = 'hr.leave'
    _inherit = ['hr.leave', 'ess.mixin']

    @api.model
    def get_leave_balance(self, employee_id):
        """Return leave balance from the employee's validated allocations.

        The source of truth is hr.leave.allocation (state=validate).
        One entry per leave type, summing days across multiple allocations
        of the same type (e.g. carry-over + annual grant).
        """
        self._get_employee(employee_id)

        allocations = self.env['hr.leave.allocation'].with_user(SUPERUSER_ID).search([
            ('employee_id', '=', employee_id),
            ('state', '=', 'validate'),
        ])

        # Aggregate allocated days per leave type
        type_data = {}
        for alloc in allocations:
            lt = alloc.holiday_status_id
            if not lt or not lt.active:
                continue
            if lt.id not in type_data:
                type_data[lt.id] = {'lt': lt, 'allocated': 0.0}
            type_data[lt.id]['allocated'] += alloc.number_of_days

        result = []
        for lt_id, data in type_data.items():
            lt = data['lt']
            allocated = data['allocated']
            lt_ctx = lt.with_context(employee_id=employee_id)
            used = lt_ctx.leaves_taken
            remaining = lt_ctx.virtual_remaining_leaves
            pending = max(0.0, allocated - used - remaining)
            result.append({
                'leave_type_id': lt.id,
                'leave_type_name': lt.name,
                'leave_type_name_ar': lt.name_ar or lt.name,
                'allocated': allocated,
                'used': used,
                'pending': pending,
                'remaining': remaining,
            })
        return result

    @api.model
    def create_leave_request(self, employee_id, leave_type_id, date_from, date_to,
                             mode='full_day', half_day=False, am_pm='morning',
                             description='', submit=True):
        """Create a new leave request and return the leave dict.

        ``mode`` is the canonical param from the mobile app:
          'full_day' | 'half_day_am' | 'half_day_pm' | 'hourly'

        Legacy ``half_day`` + ``am_pm`` params are still accepted for
        backward compatibility and take precedence over ``mode``.
        """
        # Derive half_day / am_pm from mode when not explicitly passed
        if not half_day and mode in ('half_day_am', 'half_day_pm'):
            half_day = True
            am_pm = 'morning' if mode == 'half_day_am' else 'afternoon'

        self._validate_leave_dates(date_from, date_to)
        employee = self._get_employee(employee_id)
        leave_type = self.env['hr.leave.type'].with_user(SUPERUSER_ID).browse(leave_type_id)
        if not leave_type.exists():
            raise UserError(_('Leave type not found.'))

        if half_day:
            if am_pm == 'morning':
                date_from_dt = datetime.strptime(date_from + ' 08:00:00', '%Y-%m-%d %H:%M:%S')
                date_to_dt = datetime.strptime(date_from + ' 13:00:00', '%Y-%m-%d %H:%M:%S')
            else:
                date_from_dt = datetime.strptime(date_from + ' 13:00:00', '%Y-%m-%d %H:%M:%S')
                date_to_dt = datetime.strptime(date_from + ' 18:00:00', '%Y-%m-%d %H:%M:%S')
        else:
            date_from_dt = datetime.strptime(date_from + ' 00:00:00', '%Y-%m-%d %H:%M:%S')
            date_to_dt = datetime.strptime(date_to + ' 23:59:59', '%Y-%m-%d %H:%M:%S')

        vals = {
            'employee_id': employee_id,
            'holiday_status_id': leave_type_id,
            'date_from': date_from_dt,
            'date_to': date_to_dt,
            'name': description or '/',
        }
        # Set Odoo half-day fields when supported
        if half_day:
            vals['request_unit_half'] = True
            vals['request_date_from_period'] = 'am' if am_pm == 'morning' else 'pm'

        env = self.with_user(SUPERUSER_ID).with_context(mail_notify_force_send=False)
        leave = env.create(vals)

        if submit:
            try:
                leave.action_confirm()
            except Exception:
                pass  # leave remains in draft if confirm fails

        return self._format_leave_record(leave)

    @api.model
    def get_leave_requests(self, employee_id, state_filter=None):
        """Return list of leave requests for the employee, optionally filtered by state."""
        domain = [('employee_id', '=', employee_id)]
        if state_filter:
            # Accept both Odoo state keys and frontend status values
            odoo_state = {v: k for k, v in _STATE_TO_STATUS.items()}.get(state_filter, state_filter)
            domain.append(('state', '=', odoo_state))
        leaves = self.with_user(SUPERUSER_ID).search(domain, order='date_from desc')
        return [self._format_leave_record(l) for l in leaves]

    @api.model
    def get_leave_request_detail(self, leave_id):
        """Return a full leave request dict including approval history."""
        leave = self.with_user(SUPERUSER_ID).browse(leave_id)
        if not leave.exists():
            raise UserError(_('Leave request not found.'))
        result = self._format_leave_record(leave)
        result['approval_history'] = self._get_approval_history(leave)
        return result

    @api.model
    def update_leave_request(self, leave_id, vals):
        """Update a pending leave request (description only). Returns updated dict."""
        leave = self.with_user(SUPERUSER_ID).browse(leave_id)
        if not leave.exists():
            raise UserError(_('Leave request not found.'))
        if leave.state not in ('draft', 'confirm'):
            raise UserError(_('Only draft or pending leave requests can be updated.'))
        allowed = ['name']
        write_vals = {k: v for k, v in vals.items() if k in allowed}
        if write_vals:
            leave.with_user(SUPERUSER_ID).write(write_vals)
        return self._format_leave_record(leave)

    @api.model
    def cancel_leave_request(self, leave_id):
        """Cancel a leave request. Returns True."""
        leave = self.with_user(SUPERUSER_ID).browse(leave_id)
        if not leave.exists():
            raise UserError(_('Leave request not found.'))
        if leave.state == 'refuse':
            pass  # already refused
        elif leave.state in ('draft', 'confirm', 'validate1', 'validate'):
            leave.with_user(SUPERUSER_ID).action_refuse()
        else:
            raise UserError(_('Cannot cancel a leave in state: %s') % leave.state)
        return True

    @api.model
    def approve_leave(self, leave_id, manager_employee_id):
        """First-level approval of a leave request. Returns updated leave dict."""
        leave = self.with_user(SUPERUSER_ID).browse(leave_id)
        if not leave.exists():
            raise UserError(_('Leave request not found.'))
        leave.with_user(SUPERUSER_ID).action_approve()
        return self._format_leave_record(leave)

    @api.model
    def refuse_leave(self, leave_id, manager_employee_id, reason=''):
        """Refuse a leave request with a given reason. Returns updated leave dict."""
        leave = self.with_user(SUPERUSER_ID).browse(leave_id)
        if not leave.exists():
            raise UserError(_('Leave request not found.'))
        leave.with_user(SUPERUSER_ID).action_refuse()
        if reason:
            leave.with_user(SUPERUSER_ID).message_post(
                body=_('Refusal reason: %s') % reason,
            )
        return self._format_leave_record(leave)

    @api.model
    def validate_leave(self, leave_id, hr_employee_id):
        """Second-level / HR validation. Returns updated leave dict.

        In Odoo 19 action_approve() handles both levels.
        """
        leave = self.with_user(SUPERUSER_ID).browse(leave_id)
        if not leave.exists():
            raise UserError(_('Leave request not found.'))
        leave.with_user(SUPERUSER_ID).action_approve()
        return self._format_leave_record(leave)

    @api.model
    def reset_leave_to_draft(self, leave_id):
        """Reset a refused leave request back to pending (confirm). Returns updated leave dict."""
        leave = self.with_user(SUPERUSER_ID).browse(leave_id)
        if not leave.exists():
            raise UserError(_('Leave request not found.'))
        # Try the standard Odoo method first; fall back to direct write
        try:
            leave.with_user(SUPERUSER_ID).action_draft()
            leave.with_user(SUPERUSER_ID).action_confirm()
        except Exception:
            leave.with_user(SUPERUSER_ID).write({'state': 'confirm'})
        return self._format_leave_record(leave)

    @api.model
    def get_team_leave_allocations(self, manager_employee_id):
        """Return status + leave balance dicts for all employees reporting to the manager."""
        manager = self._get_employee(manager_employee_id)
        company_id = manager.company_id.id if manager.company_id else False
        team_domain = [('parent_id', '=', manager_employee_id), ('active', '=', True)]
        if company_id:
            team_domain.append(('company_id', '=', company_id))
        team_members = self.env['hr.employee'].with_user(SUPERUSER_ID).search(team_domain)
        lt_domain = [('active', '=', True)]
        if company_id:
            lt_domain.append(('company_id', 'in', [company_id, False]))
        leave_types = self.env['hr.leave.type'].with_user(SUPERUSER_ID).search(lt_domain)
        today = fields.Date.today()
        result = []
        for emp in team_members:
            # Determine today's leave status
            today_leave = self.with_user(SUPERUSER_ID).search([
                ('employee_id', '=', emp.id),
                ('state', 'in', ('validate1', 'validate')),
                ('date_from', '<=', today),
                ('date_to', '>=', today),
            ], limit=1)
            pending_leave = self.with_user(SUPERUSER_ID).search([
                ('employee_id', '=', emp.id),
                ('state', '=', 'confirm'),
                ('date_from', '<=', today),
                ('date_to', '>=', today),
            ], limit=1)

            if today_leave:
                status = 'on_leave'
                leave_info = today_leave.holiday_status_id.name
                leave_info_ar = today_leave.holiday_status_id.name_ar or leave_info
            elif pending_leave:
                status = 'pending'
                leave_info = 'Leave request pending approval'
                leave_info_ar = 'طلب إجازة قيد الموافقة'
            else:
                status = 'present'
                leave_info = ''
                leave_info_ar = ''

            emp_balances = []
            for lt in leave_types:
                lt_ctx = lt.with_context(employee_id=emp.id)
                allocated = lt_ctx.max_leaves
                used = lt_ctx.leaves_taken
                remaining = lt_ctx.virtual_remaining_leaves
                pending_days = max(0, allocated - used - remaining)
                emp_balances.append({
                    'leave_type_id': lt.id,
                    'leave_type_name': lt.name,
                    'leave_type_name_ar': lt.name_ar or lt.name,
                    'allocated': allocated,
                    'used': used,
                    'pending': pending_days,
                    'remaining': remaining,
                })

            result.append({
                'employee_id': emp.id,
                'employee': emp.name,
                'employee_ar': emp.name,  # Arabic name not standard in Odoo; same until localised
                'status': status,
                'leave_info': leave_info,
                'leave_info_ar': leave_info_ar,
                'balances': emp_balances,
            })
        return result

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _get_leave_mode(self, leave):
        """Derive frontend mode string from an hr.leave record."""
        try:
            if leave.request_unit_half:
                period = getattr(leave, 'request_date_from_period', 'am')
                return 'half_day_pm' if period == 'pm' else 'half_day_am'
            if getattr(leave, 'request_unit_hours', False):
                return 'hourly'
        except Exception:
            pass
        return 'full_day'

    def _get_approval_history(self, leave):
        """Build approval step list from the leave's chatter tracking values."""
        history = []
        step = 1
        try:
            for msg in leave.message_ids.sorted('date'):
                for tracking in msg.sudo().tracking_value_ids:
                    field_name = tracking.field_id.name if tracking.field_id else ''
                    if field_name != 'state':
                        continue
                    new_state = tracking.new_value_char or ''
                    if new_state == 'validate1':
                        status = 'approved'
                    elif new_state == 'validate':
                        status = 'validated'
                    elif new_state == 'refuse':
                        status = 'refused'
                    else:
                        continue
                    author = msg.author_id.name if msg.author_id else ''
                    history.append({
                        'step': step,
                        'approver': author,
                        'approver_ar': author,
                        'status': status,
                        'date': msg.date.strftime('%Y-%m-%d %H:%M:%S') if msg.date else None,
                        'note': '',
                    })
                    step += 1
        except Exception:
            pass
        return history

    def _format_leave_record(self, leave):
        """Format an hr.leave record into a plain dict matching the mobile LeaveRequest type."""
        state = leave.state or 'draft'
        status = _STATE_TO_STATUS.get(state, state)
        emp = leave.employee_id
        lt = leave.holiday_status_id
        return {
            'id': leave.id,
            'employee_id': emp.id,
            'employee': emp.name or '',
            'employee_ar': emp.name or '',  # same until Arabic name field is localised
            'leave_type_id': lt.id,
            'leave_type': lt.name or '',
            'leave_type_ar': lt.name_ar or lt.name or '',
            'mode': self._get_leave_mode(leave),
            'date_from': leave.date_from.strftime('%Y-%m-%d') if leave.date_from else '',
            'date_to': leave.date_to.strftime('%Y-%m-%d') if leave.date_to else '',
            'duration': leave.number_of_days,
            'status': status,
            'description': leave.name or '',
            'approval_history': [],
            'created_at': leave.create_date.strftime('%Y-%m-%d') if leave.create_date else '',
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
