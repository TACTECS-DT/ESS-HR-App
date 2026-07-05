from datetime import datetime
from odoo import models, fields, api, _, SUPERUSER_ID
from odoo.exceptions import UserError, ValidationError

from ..tz_utils import utc_to_iso_string, utc_to_date_string

# Odoo 19 hr.leave state values (sent as-is to the app — no remapping).
#   confirm   → To Approve    (employee submitted, awaiting manager)
#   validate1 → Second Approval
#   validate  → Approved
#   refuse    → Refused
#   cancel    → Cancelled
_ODOO_STATES = {'confirm', 'validate1', 'validate', 'refuse', 'cancel'}


class HrLeaveTypeExt(models.Model):
    _name = 'hr.leave.type'
    _inherit = ['hr.leave.type', 'ess.mixin']

    name_ar = fields.Char(string='Arabic Name')
    mobile_require_attachment = fields.Boolean(string='Require Attachment on Mobile', default=False)
    mobile_require_description = fields.Boolean(string='Require Description on Mobile', default=False)

    @api.model
    def get_leave_types(self, employee_id=None):
        """Return leave types available for the employee to request.

        Replicates Odoo 19's exact form domain (hr_leave_views.xml lines 354-367):

          '|'
            requires_allocation = False         → no allocation needed, always include
            '&'
              has_valid_allocation = True        → state='validate' allocation exists this year
              '|'
                allows_negative = True           → can go into negative balance
                virtual_remaining_leaves > 0    → has days remaining

        Also mirrors Odoo's record rule (hr_holidays_status_rule_multi_company):
          company_id = employee's company
          OR (company_id = False AND country_id = employee's country OR False)
        Global leave types (company_id=False) that belong to a different country
        are excluded — same as Odoo's record rule.

        Allocation check uses the same logic as _search_valid (state='validate' +
        current-year date overlap) rather than _compute_valid, matching what the
        form search actually produces.
        """
        employee = None
        if employee_id:
            employee = self._get_employee(employee_id)

        # ── domain: mirror Odoo's multi-company record rule ──────────────────
        company_id = employee.company_id.id if employee and employee.company_id else False
        country_id = (
            employee.company_id.country_id.id
            if employee and employee.company_id and employee.company_id.country_id
            else False
        )

        if company_id:
            # Mirrors hr_holidays_status_rule_multi_company:
            #   type.company_id = employee_company
            #   OR (type.company_id = False AND type.country_id in [company_country, False])
            domain = [
                ('active', '=', True),
                '|',
                    ('company_id', '=', company_id),
                    '&',
                        ('company_id', '=', False),
                        ('country_id', 'in', [country_id, False] if country_id else [False]),
            ]
        else:
            domain = [('active', '=', True)]

        leave_types = self.with_user(SUPERUSER_ID).search(domain)

        # ── find types that have a validated allocation for this employee ─────
        # Mirrors _search_valid: state='validate', overlap with current calendar year.
        # Single bulk query — much more efficient than calling _compute_valid per type.
        allocated_type_ids = set()
        if employee_id:
            today = fields.Date.today()
            year_start = today.replace(month=1, day=1)
            year_end = today.replace(month=12, day=31)
            validated_allocs = self.env['hr.leave.allocation'].with_user(SUPERUSER_ID).search([
                ('employee_id', '=', employee_id),
                ('state', '=', 'validate'),
                ('date_from', '<=', year_end),
                '|',
                    ('date_to', '>=', year_start),
                    ('date_to', '=', False),
            ])
            allocated_type_ids = set(validated_allocs.mapped('holiday_status_id.id'))

        result = []
        for lt in leave_types:
            if employee_id:
                if lt.requires_allocation:
                    # Condition 1: has_valid_allocation (state='validate' alloc exists)
                    if lt.id not in allocated_type_ids:
                        continue
                    # Condition 2: allows_negative OR virtual_remaining_leaves > 0
                    if not lt.allows_negative:
                        if lt.with_context(employee_id=employee_id).virtual_remaining_leaves <= 0:
                            continue
                # requires_allocation=False → always include

            req_unit = getattr(lt, 'request_unit', 'day')
            result.append({
                'id': lt.id,
                'name': lt.name,
                'name_ar': lt.name_ar or lt.name,
                'requires_attachment': lt.mobile_require_attachment,
                'requires_description': lt.mobile_require_description,
                'request_unit': req_unit,          # 'day' | 'half_day' | 'hour'
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
                             mode='full_day', hour_from=None, hour_to=None,
                             description=''):
        """Create and immediately submit a leave request (always confirm state).

        ``mode`` — 'full_day' | 'half_day_am' | 'half_day_pm' | 'hourly'

        For half_day modes: only ``date_from`` is required (single day).
        For hourly mode: ``hour_from`` / ``hour_to`` are float hours (e.g. 8.5 = 08:30).

        We set Odoo's ``request_date_from`` / ``request_date_to`` (Date) and
        the mode-specific fields so that Odoo's own ``_compute_date_from_to``
        derives the correct ``date_from`` / ``date_to`` datetimes from the
        employee's work calendar — same as the web form does.
        """
        if not date_from:
            raise ValidationError(_('Leave start date is required.'))
        try:
            d_from = datetime.strptime(date_from, '%Y-%m-%d').date()
        except ValueError:
            raise ValidationError(_('Invalid date format. Use YYYY-MM-DD.'))

        is_half_day = mode in ('half_day_am', 'half_day_pm')
        is_hourly = mode == 'hourly'

        # half_day and hourly are always single-day; full_day requires date_to
        if is_half_day or is_hourly:
            d_to = d_from
        else:
            if not date_to:
                raise ValidationError(_('Leave end date is required.'))
            try:
                d_to = datetime.strptime(date_to, '%Y-%m-%d').date()
            except ValueError:
                raise ValidationError(_('Invalid date format. Use YYYY-MM-DD.'))
            if d_from > d_to:
                raise ValidationError(_('Leave start date must be before or equal to end date.'))

        self._get_employee(employee_id)
        leave_type = self.env['hr.leave.type'].with_user(SUPERUSER_ID).browse(leave_type_id)
        if not leave_type.exists():
            raise UserError(_('Leave type not found.'))

        # Build vals using Odoo's request_* Date fields so _compute_date_from_to
        # derives date_from/date_to using the employee's work calendar.
        vals = {
            'employee_id': employee_id,
            'holiday_status_id': leave_type_id,
            'request_date_from': d_from,
            'request_date_to': d_to,
            'name': description or '/',
        }

        if is_half_day:
            # request_date_from_period: 'am' (morning) or 'pm' (afternoon)
            vals['request_date_from_period'] = 'am' if mode == 'half_day_am' else 'pm'
        elif is_hourly:
            # hour_from / hour_to are floats: 8.0 = 08:00, 8.5 = 08:30
            if hour_from is not None:
                vals['request_hour_from'] = float(hour_from)
            if hour_to is not None:
                vals['request_hour_to'] = float(hour_to)

        env = self.with_user(SUPERUSER_ID).with_context(mail_notify_force_send=False)
        # In Odoo 19, hr.leave.state defaults to 'confirm' — no draft state.
        #
        # WHY SAVEPOINT + flush_all():
        #   Odoo 19 defers stored-field recomputes and @api.constrains checks
        #   until flush_all() is called (not immediately inside create()).
        #   Without an explicit flush inside the try block, create() returns
        #   successfully, we release the SAVEPOINT, and the constraint fires
        #   later — leaving the record committed in the DB.
        #
        #   flush_all() forces: recompute date_from/date_to → _check_date runs.
        #   If it raises (overlap, insufficient balance, etc.) we're still inside
        #   the SAVEPOINT and can roll back cleanly.
        #
        #   invalidate_all(flush=False) after rollback clears the stale in-memory
        #   ORM cache so the rolled-back record doesn't bleed into later queries.
        cr = self.env.cr
        cr.execute('SAVEPOINT ess_create_leave')
        try:
            leave = env.create(vals)
            env.env.flush_all()                  # trigger deferred constraints NOW
            cr.execute('RELEASE SAVEPOINT ess_create_leave')
        except Exception:
            cr.execute('ROLLBACK TO SAVEPOINT ess_create_leave')
            env.env.invalidate_all(flush=False)  # clear stale ORM cache
            raise  # propagate to call_and_log → proper 400 error to the app

        return self._format_leave_record(leave)

    def _get_leave_managed_employee_ids(self, user):
        """Return IDs of active employees where the given res.users is their leave_manager_id."""
        employees = self.env['hr.employee'].with_user(SUPERUSER_ID).search([
            ('leave_manager_id', '=', user.id),
            ('active', '=', True),
        ])
        return employees.ids

    @api.model
    def get_leave_requests(self, employee_id, state_filter=None, scope='mine'):
        """Return leave requests filtered by scope and optional state.

        scope='mine'  — only the employee's own records (all roles).
        scope='all'   — manager: own + team; hr/admin: all company records.
                        Regular employees fall back to 'mine' silently.
        """
        employee = self._get_employee(employee_id)

        if scope == 'all':
            role = self.env['hr.employee']._compute_ess_role(employee)
            if role in ('hr', 'admin'):
                domain = []
            elif role == 'manager' and employee.user_id:
                managed_ids = self._get_leave_managed_employee_ids(employee.user_id)
                domain = [('employee_id', 'in', list(set(managed_ids + [employee_id])))]
            else:
                domain = [('employee_id', '=', employee_id)]
        else:
            domain = [('employee_id', '=', employee_id)]

        if state_filter and state_filter in _ODOO_STATES:
            domain.append(('state', '=', state_filter))

        leaves = self.with_user(SUPERUSER_ID).search(domain, order='date_from desc')
        return [self._format_leave_record(l) for l in leaves]

    @api.model
    def get_leave_request_detail(self, leave_id, acting_employee_id=None):
        """Return a full leave request dict including approval history and can_approve flag.

        can_approve=True only when the acting employee is the leave_manager_id of the
        leave's employee (or parent_id user when leave_manager_id is not set).
        parent_id-only managers see the leave but get can_approve=False.
        """
        leave = self.with_user(SUPERUSER_ID).browse(leave_id)
        if not leave.exists():
            raise UserError(_('Leave request not found.'))
        result = self._format_leave_record(leave)
        result['approval_history'] = self._get_approval_history(leave)
        result['can_approve'] = self._can_employee_approve_leave(leave, acting_employee_id)
        return result

    def _can_employee_approve_leave(self, leave, acting_employee_id):
        """Return True if acting_employee_id is the authorised first-level leave approver.

        Priority:
          1. If employee has leave_manager_id set → only that user qualifies.
          2. Fallback: if no leave_manager_id → parent_id user qualifies.
          3. HR/admin always qualify (they use validate, not approve, but we allow both).
        """
        if not acting_employee_id:
            return False
        acting_emp = self.env['hr.employee'].with_user(SUPERUSER_ID).browse(acting_employee_id)
        if not acting_emp.exists() or not acting_emp.user_id:
            return False
        user = acting_emp.user_id
        # HR / admin can always act
        if user.has_group('hr_holidays.group_hr_holidays_user') or user.has_group('base.group_system'):
            return True
        leave_emp = leave.employee_id
        if leave_emp.leave_manager_id:
            return leave_emp.leave_manager_id.id == user.id
        # Fallback to direct manager
        if leave_emp.parent_id and leave_emp.parent_id.user_id:
            return leave_emp.parent_id.user_id.id == user.id
        return False

    @api.model
    def update_leave_request(self, leave_id, vals):
        """Update a pending leave request (description only). Returns updated dict."""
        leave = self.with_user(SUPERUSER_ID).browse(leave_id)
        if not leave.exists():
            raise UserError(_('Leave request not found.'))
        if leave.state != 'confirm':
            raise UserError(_('Only draft or pending leave requests can be updated.'))
        allowed = ['name']
        write_vals = {k: v for k, v in vals.items() if k in allowed}
        if write_vals:
            leave.with_user(SUPERUSER_ID).write(write_vals)
        return self._format_leave_record(leave)

    @api.model
    def cancel_leave_request(self, leave_id):
        """Delete a leave request. Returns True.

        Deletable states (Odoo 19):
          confirm   → employee's own pending request, not yet acted on
          refuse    → already refused, just cleaning up
          cancel    → already cancelled

        Approved leaves (validate1 / validate) are blocked — they affect
        calendar entries and allocation balances that should be reversed through
        the proper approval workflow, not deleted silently.

        unlink() calls _post_leave_cancel() internally, which removes calendar
        entries and causes allocation balance to be recalculated automatically.
        """
        leave = self.with_user(SUPERUSER_ID).browse(leave_id)
        if not leave.exists():
            raise UserError(_('Leave request not found.'))
        if leave.state in ('validate1', 'validate'):
            raise UserError(_(
                'Approved leave requests cannot be deleted. '
                'Please contact HR to reverse the approval.'
            ))
        leave.with_user(SUPERUSER_ID).unlink()
        return True

    @api.model
    def approve_leave(self, leave_id, manager_employee_id):
        """First-level approval of a leave request.

        Validates that the acting user is the leave_manager_id of the leave's
        employee. Falls back to parent_id user when leave_manager_id is not set.
        Returns updated leave dict.
        """
        leave = self.with_user(SUPERUSER_ID).browse(leave_id)
        if not leave.exists():
            raise UserError(_('Leave request not found.'))
        if leave.state != 'confirm':
            raise UserError(_('Only leaves in "To Approve" state can be approved at this stage.'))

        manager_emp = self.env['hr.employee'].with_user(SUPERUSER_ID).browse(manager_employee_id)
        if not manager_emp.exists() or not manager_emp.user_id:
            raise UserError(_('Manager employee not found.'))

        leave_employee = leave.employee_id
        if leave_employee.leave_manager_id:
            if leave_employee.leave_manager_id.id != manager_emp.user_id.id:
                raise UserError(_('You are not the assigned leave manager for this employee.'))
        elif leave_employee.parent_id and leave_employee.parent_id.user_id:
            if leave_employee.parent_id.user_id.id != manager_emp.user_id.id:
                raise UserError(_('You are not the direct manager for this employee.'))

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
        # In Odoo 19 there is no 'draft' state. Resetting means writing 'confirm'
        # (To Approve) directly — that's the earliest state in the Odoo 19 workflow.
        leave.with_user(SUPERUSER_ID).write({'state': 'confirm'})
        return self._format_leave_record(leave)

    @api.model
    def get_team_leave_allocations(self, manager_employee_id):
        """Return status + leave balance dicts for all employees reporting to the manager.

        Each employee's balances only include leave types they have a validated
        allocation for — same source-of-truth as get_leave_balance().
        All team allocations are loaded in a single bulk query for efficiency.
        """
        manager = self._get_employee(manager_employee_id)
        company_id = manager.company_id.id if manager.company_id else False
        team_domain = [('parent_id', '=', manager_employee_id), ('active', '=', True)]
        if company_id:
            team_domain.append(('company_id', '=', company_id))
        team_members = self.env['hr.employee'].with_user(SUPERUSER_ID).search(team_domain)

        if not team_members:
            return []

        today = fields.Date.today()

        # Bulk-load all validated allocations for the whole team in one query
        all_allocations = self.env['hr.leave.allocation'].with_user(SUPERUSER_ID).search([
            ('employee_id', 'in', team_members.ids),
            ('state', '=', 'validate'),
        ])

        # Group: {employee_id: {lt_id: {'lt': record, 'allocated': float}}}
        emp_lt_data = {}
        for alloc in all_allocations:
            emp_id = alloc.employee_id.id
            lt = alloc.holiday_status_id
            if not lt or not lt.active:
                continue
            if emp_id not in emp_lt_data:
                emp_lt_data[emp_id] = {}
            if lt.id not in emp_lt_data[emp_id]:
                emp_lt_data[emp_id][lt.id] = {'lt': lt, 'allocated': 0.0}
            emp_lt_data[emp_id][lt.id]['allocated'] += alloc.number_of_days

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

            # Only include leave types this employee has a validated allocation for
            emp_balances = []
            for lt_id, data in (emp_lt_data.get(emp.id) or {}).items():
                lt = data['lt']
                lt_ctx = lt.with_context(employee_id=emp.id)
                allocated = data['allocated']
                used = lt_ctx.leaves_taken
                remaining = lt_ctx.virtual_remaining_leaves
                pending_days = max(0.0, allocated - used - remaining)
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
                'employee_ar': emp.name,
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
                        'date': utc_to_iso_string(msg.date) or None,
                        'note': '',
                    })
                    step += 1
        except Exception:
            pass
        return history

    def _format_leave_record(self, leave):
        """Format an hr.leave record into a plain dict matching the mobile LeaveRequest type."""
        status = leave.state if leave.state in _ODOO_STATES else 'cancel'
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
            'date_from': utc_to_date_string(leave.date_from) or '',
            'date_to': utc_to_date_string(leave.date_to) or '',
            'duration': leave.number_of_days,
            'status': status,
            'description': leave.name or '',
            'approval_history': [],
            'created_at': utc_to_date_string(leave.create_date) or '',
        }

