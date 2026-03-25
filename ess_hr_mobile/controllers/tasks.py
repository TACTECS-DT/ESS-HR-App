"""
Tasks & Timesheets controller.

Tasks (project.task) and timesheets (account.analytic.line) are
grouped here because timesheets always belong to a task context.
"""
from odoo import http
from odoo.http import request

from .utils import call_and_log, get_body


class TasksController(http.Controller):

    # ── Tasks ─────────────────────────────────────────────────────────────────

    @http.route('/ess/api/tasks/list', type='http', auth='none', methods=['POST'], csrf=False)
    def list(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/tasks/list', employee_id,
            lambda: request.env['project.task'].sudo().get_tasks(employee_id),
        )

    @http.route('/ess/api/tasks/detail', type='http', auth='none', methods=['POST'], csrf=False)
    def detail(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/tasks/detail', employee_id,
            lambda: request.env['project.task'].sudo().get_task_detail(kw.get('task_id')),
        )

    @http.route('/ess/api/tasks/update-stage', type='http', auth='none', methods=['POST'], csrf=False)
    def update_stage(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/tasks/update-stage', employee_id,
            lambda: request.env['project.task'].sudo().update_task_stage(
                kw.get('task_id'), kw.get('stage_id'),
            ),
        )

    @http.route('/ess/api/tasks/attachments', type='http', auth='none', methods=['POST'], csrf=False)
    def attachments(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/tasks/attachments', employee_id,
            lambda: request.env['project.task'].sudo().get_task_attachments(kw.get('task_id')),
        )

    @http.route('/ess/api/tasks/add-attachment', type='http', auth='none', methods=['POST'], csrf=False)
    def add_attachment(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/tasks/add-attachment', employee_id,
            lambda: request.env['project.task'].sudo().add_task_attachment(
                kw.get('task_id'), kw.get('filename'), kw.get('file_base64'),
            ),
        )

    # ── Timesheets ────────────────────────────────────────────────────────────

    @http.route('/ess/api/timesheets/log', type='http', auth='none', methods=['POST'], csrf=False)
    def timesheet_log(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/timesheets/log', employee_id,
            lambda: request.env['account.analytic.line'].sudo().log_timesheet(
                employee_id,
                kw.get('task_id'),
                kw.get('date'),
                kw.get('unit_amount'),
                kw.get('name', '/'),
            ),
        )

    @http.route('/ess/api/timesheets/daily', type='http', auth='none', methods=['POST'], csrf=False)
    def timesheet_daily(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/timesheets/daily', employee_id,
            lambda: request.env['account.analytic.line'].sudo().get_daily_timesheet(
                employee_id, kw.get('date'),
            ),
        )

    @http.route('/ess/api/timesheets/weekly', type='http', auth='none', methods=['POST'], csrf=False)
    def timesheet_weekly(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/timesheets/weekly', employee_id,
            lambda: request.env['account.analytic.line'].sudo().get_weekly_timesheet(
                employee_id, kw.get('week_start'),
            ),
        )
