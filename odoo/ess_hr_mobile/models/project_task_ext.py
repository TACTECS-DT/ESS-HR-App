import base64
from datetime import datetime, timedelta, date
from odoo import models, fields, api, _
from odoo.exceptions import UserError


class ProjectTaskExt(models.Model):
    _name = 'project.task'
    _inherit = ['project.task', 'ess.mixin']

    @api.model
    def get_tasks(self, employee_id):
        """Return list of task summary dicts assigned to the employee's user."""
        employee = self.env['hr.employee'].sudo().browse(employee_id)
        if not employee.exists():
            raise UserError(_('Employee not found.'))
        user_id = employee.user_id.id if employee.user_id else False
        if not user_id:
            return []
        domain = [('user_ids', 'in', [user_id])]
        tasks = self.sudo().search(domain, order='date_deadline asc')
        return [self._format_task_summary(t) for t in tasks]

    @api.model
    def get_task_detail(self, task_id):
        """Return a full task dict."""
        task = self.sudo().browse(task_id)
        if not task.exists():
            raise UserError(_('Task not found.'))
        return self._format_task_record(task)

    @api.model
    def update_task_stage(self, task_id, stage_id):
        """Move a task to the given stage. Returns True."""
        task = self.sudo().browse(task_id)
        if not task.exists():
            raise UserError(_('Task not found.'))
        stage = self.env['project.task.type'].sudo().browse(stage_id)
        if not stage.exists():
            raise UserError(_('Stage not found.'))
        task.sudo().write({'stage_id': stage_id})
        return True

    @api.model
    def get_task_attachments(self, task_id):
        """Return list of attachment dicts for the task."""
        task = self.sudo().browse(task_id)
        if not task.exists():
            raise UserError(_('Task not found.'))
        attachments = self.env['ir.attachment'].sudo().search([
            ('res_model', '=', 'project.task'),
            ('res_id', '=', task_id),
        ])
        return [{
            'id': a.id,
            'name': a.name,
            'mimetype': a.mimetype,
            'file_size': a.file_size,
            'create_date': a.create_date.strftime('%Y-%m-%d %H:%M:%S') if a.create_date else False,
        } for a in attachments]

    @api.model
    def add_task_attachment(self, task_id, filename, file_base64):
        """Add a file attachment to a task and return the attachment dict."""
        task = self.sudo().browse(task_id)
        if not task.exists():
            raise UserError(_('Task not found.'))
        attachment = self.env['ir.attachment'].sudo().create({
            'name': filename,
            'datas': file_base64,
            'res_model': 'project.task',
            'res_id': task_id,
            'type': 'binary',
        })
        return {
            'id': attachment.id,
            'name': attachment.name,
            'mimetype': attachment.mimetype,
            'file_size': attachment.file_size,
        }

    def _format_task_record(self, task):
        """Format an project.task into a full detail dict."""
        try:
            description = str(task.description) if task.description else ''
        except Exception:
            description = ''
        try:
            effective_hours = task.effective_hours or 0.0
        except Exception:
            effective_hours = 0.0
        try:
            kanban_state = task.kanban_state
        except Exception:
            kanban_state = 'normal'
        return {
            'id': task.id,
            'name': task.name,
            'project_id': task.project_id.id if task.project_id else False,
            'project_name': task.project_id.name if task.project_id else '',
            'stage_id': task.stage_id.id if task.stage_id else False,
            'stage_name': task.stage_id.name if task.stage_id else '',
            'priority': task.priority,
            'date_deadline': task.date_deadline.strftime('%Y-%m-%d') if task.date_deadline else False,
            'description': description,
            'user_ids': task.user_ids.ids if hasattr(task, 'user_ids') else [],
            'tag_ids': task.tag_ids.ids if hasattr(task, 'tag_ids') else [],
            'planned_hours': (task.allocated_hours if hasattr(task, 'allocated_hours') else 0.0),
            'effective_hours': effective_hours,
            'kanban_state': kanban_state,
            'active': task.active,
        }

    def _format_task_summary(self, task):
        """Format a task into a summary dict."""
        return {
            'id': task.id,
            'name': task.name,
            'project_id': task.project_id.id if task.project_id else False,
            'project_name': task.project_id.name if task.project_id else '',
            'stage_id': task.stage_id.id if task.stage_id else False,
            'stage_name': task.stage_id.name if task.stage_id else '',
            'priority': task.priority,
            'date_deadline': task.date_deadline.strftime('%Y-%m-%d') if task.date_deadline else False,
            'effective_hours': task.effective_hours or 0.0,
        }


class AccountAnalyticLineExt(models.Model):
    _name = 'account.analytic.line'
    _inherit = ['account.analytic.line', 'ess.mixin']

    @api.model
    def get_timesheets(self, employee_id, date_from=None, date_to=None):
        """Return a list of timesheet entries for the employee, optionally date-filtered."""
        employee = self.env['hr.employee'].sudo().browse(employee_id)
        if not employee.exists():
            raise UserError(_('Employee not found.'))
        domain = [('employee_id', '=', employee_id)]
        if date_from:
            domain.append(('date', '>=', date_from))
        if date_to:
            domain.append(('date', '<=', date_to))
        lines = self.sudo().search(domain, order='date desc')
        return [self._format_timesheet_record(l) for l in lines]

    @api.model
    def update_timesheet(self, timesheet_id, vals):
        """Update a timesheet entry and return the updated dict."""
        line = self.sudo().browse(timesheet_id)
        if not line.exists():
            raise UserError(_('Timesheet entry not found.'))
        employee = line.employee_id
        allowed = ['date', 'unit_amount', 'name', 'task_id']
        write_vals = {k: v for k, v in vals.items() if k in allowed}
        self._env_for_write(employee).browse(line.id).write(write_vals)
        line.invalidate_recordset()
        return self._format_timesheet_record(line)

    @api.model
    def delete_timesheet(self, timesheet_id):
        """Delete a timesheet entry. Returns True."""
        line = self.sudo().browse(timesheet_id)
        if not line.exists():
            raise UserError(_('Timesheet entry not found.'))
        employee = line.employee_id
        self._env_for_write(employee).browse(line.id).unlink()
        return True

    @api.model
    def get_team_hours(self, manager_employee_id, date_from=None, date_to=None):
        """Return total logged hours per employee for the manager's direct reports."""
        manager = self.env['hr.employee'].sudo().browse(manager_employee_id)
        if not manager.exists():
            raise UserError(_('Employee not found.'))
        team = self.env['hr.employee'].sudo().search([('parent_id', '=', manager_employee_id)])
        if not team:
            return []
        team_ids = team.ids
        domain = [('employee_id', 'in', team_ids)]
        if date_from:
            domain.append(('date', '>=', date_from))
        if date_to:
            domain.append(('date', '<=', date_to))
        lines = self.sudo().search(domain)
        # Group by employee
        from collections import defaultdict
        emp_hours = defaultdict(float)
        for line in lines:
            emp_hours[line.employee_id.id] += line.unit_amount or 0.0
        result = []
        for emp in team:
            result.append({
                'employee_id': emp.id,
                'employee_name': emp.name,
                'total_hours': round(emp_hours.get(emp.id, 0.0), 2),
            })
        return result

    @api.model
    def log_timesheet(self, employee_id, task_id, date, unit_amount, name):
        """Create a timesheet entry for an employee on a task. Returns timesheet dict."""
        employee = self._get_employee(employee_id)
        task = self.env['project.task'].sudo().browse(task_id)
        if not task.exists():
            raise UserError(_('Task not found.'))
        if unit_amount <= 0:
            raise UserError(_('Duration must be greater than zero.'))
        vals = {
            'employee_id': employee_id,
            'task_id': task_id,
            'project_id': task.project_id.id if task.project_id else False,
            'date': date,
            'unit_amount': unit_amount,
            'name': name or '/',
        }
        if employee.user_id:
            vals['user_id'] = employee.user_id.id
        line = self._env_for_write(employee).create(vals)
        return self._format_timesheet_record(line)

    @api.model
    def get_daily_timesheet(self, employee_id, date):
        """Return list of timesheet entries for the employee on the given date, with daily total."""
        employee = self.env['hr.employee'].sudo().browse(employee_id)
        if not employee.exists():
            raise UserError(_('Employee not found.'))
        domain = [('employee_id', '=', employee_id), ('date', '=', date)]
        lines = self.sudo().search(domain, order='date asc')
        records = [self._format_timesheet_record(l) for l in lines]
        total_hours = sum(l.unit_amount for l in lines)
        return {
            'date': date,
            'total_hours': round(total_hours, 2),
            'entries': records,
        }

    @api.model
    def get_weekly_timesheet(self, employee_id, week_start):
        """Return timesheets grouped by day for the week starting on week_start (YYYY-MM-DD)."""
        employee = self.env['hr.employee'].sudo().browse(employee_id)
        if not employee.exists():
            raise UserError(_('Employee not found.'))
        if not week_start:
            today = date.today()
            week_start = (today - timedelta(days=today.weekday())).strftime('%Y-%m-%d')
        start_dt = datetime.strptime(week_start, '%Y-%m-%d').date()
        end_dt = start_dt + timedelta(days=6)
        domain = [
            ('employee_id', '=', employee_id),
            ('date', '>=', start_dt.strftime('%Y-%m-%d')),
            ('date', '<=', end_dt.strftime('%Y-%m-%d')),
        ]
        lines = self.sudo().search(domain, order='date asc')
        grouped = self._group_timesheets_by_day(lines)
        total_week_hours = sum(d['total_hours'] for d in grouped)
        return {
            'week_start': week_start,
            'week_end': end_dt.strftime('%Y-%m-%d'),
            'total_hours': round(total_week_hours, 2),
            'days': grouped,
        }

    def _format_timesheet_record(self, line):
        """Format an account.analytic.line into a plain dict."""
        return {
            'id': line.id,
            'employee_id': line.employee_id.id if line.employee_id else False,
            'employee_name': line.employee_id.name if line.employee_id else '',
            'task_id': line.task_id.id if line.task_id else False,
            'task_name': line.task_id.name if line.task_id else '',
            'project_id': line.project_id.id if line.project_id else False,
            'project_name': line.project_id.name if line.project_id else '',
            'date': line.date.strftime('%Y-%m-%d') if line.date else False,
            'unit_amount': round(line.unit_amount, 2),
            'name': line.name or '',
        }

    def _group_timesheets_by_day(self, lines):
        """Group a recordset of timesheet lines by day and return list of day dicts."""
        from collections import defaultdict
        day_map = defaultdict(list)
        for line in lines:
            day_key = line.date.strftime('%Y-%m-%d') if line.date else 'unknown'
            day_map[day_key].append(line)
        result = []
        for day_str in sorted(day_map.keys()):
            day_lines = day_map[day_str]
            total = sum(l.unit_amount for l in day_lines)
            result.append({
                'date': day_str,
                'total_hours': round(total, 2),
                'entries': [self._format_timesheet_record(l) for l in day_lines],
            })
        return result
