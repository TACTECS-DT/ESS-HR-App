"""
Tasks & Timesheets controller.

Tasks (project.task) and timesheets (account.analytic.line) are
grouped here because timesheets always belong to a task context.

NOTE: Both features are temporarily disabled — they work with res.users context,
not hr.employee. Set _FEATURES_ENABLED = True to re-activate all routes.
"""
from odoo import http
from odoo.http import request

from .utils import call_and_log, get_body, get_auth_context, json_error

# Set to True once Tasks & Timesheets are adapted to hr.employee context
_FEATURES_ENABLED = False

def _disabled():
    return json_error(
        'Tasks and Timesheets are not available yet. Coming soon.',
        503,
        'FEATURE_DISABLED',
    )


class TasksController(http.Controller):

    # ── Tasks ─────────────────────────────────────────────────────────────────

    @http.route('/ess/api/tasks', type='http', auth='none', methods=['GET', 'POST'], csrf=False)
    def list(self):
        if not _FEATURES_ENABLED:
            return _disabled()
        kw = get_body()
        employee_id = kw.get('employee_id') or get_auth_context().get('employee_id')
        return call_and_log(
            '/ess/api/tasks',
            lambda: request.env['project.task'].sudo().get_tasks(employee_id),
        )

    @http.route('/ess/api/tasks/<int:task_id>', type='http', auth='none', methods=['GET', 'PATCH'], csrf=False)
    def task_by_id(self, task_id):
        if not _FEATURES_ENABLED:
            return _disabled()
        kw = get_body()
        if request.httprequest.method == 'GET':
            return call_and_log(
                '/ess/api/tasks/<id>',
                lambda: request.env['project.task'].sudo().get_task_detail(task_id),
            )
        # PATCH
        return call_and_log(
            '/ess/api/tasks/<id>',
            lambda: request.env['project.task'].sudo().update_task_stage(
                task_id, kw.get('stage_id'),
            ),
        )

    @http.route('/ess/api/tasks/<int:task_id>/attachments', type='http', auth='none', methods=['GET', 'POST'], csrf=False)
    def task_attachments(self, task_id):
        if not _FEATURES_ENABLED:
            return _disabled()
        kw = get_body()
        if request.httprequest.method == 'GET':
            return call_and_log(
                '/ess/api/tasks/<id>/attachments',
                lambda: request.env['project.task'].sudo().get_task_attachments(task_id),
            )
        # POST
        return call_and_log(
            '/ess/api/tasks/<id>/attachments',
            lambda: request.env['project.task'].sudo().add_task_attachment(
                task_id, kw.get('filename'), kw.get('file_base64'),
            ),
        )

    # ── Timesheets ────────────────────────────────────────────────────────────

    @http.route('/ess/api/timesheets/<int:timesheet_id>', type='http', auth='none', methods=['GET', 'PATCH', 'DELETE'], csrf=False)
    def timesheet_by_id(self, timesheet_id):
        if not _FEATURES_ENABLED:
            return _disabled()
        kw = get_body()
        employee_id = kw.get('employee_id') or get_auth_context().get('employee_id')
        method = request.httprequest.method
        if method == 'GET':
            return call_and_log(
                '/ess/api/timesheets/<id>',
                lambda: request.env['account.analytic.line'].sudo().get_timesheets(employee_id),
            )
        if method == 'PATCH':
            return call_and_log(
                '/ess/api/timesheets/<id>',
                lambda: request.env['account.analytic.line'].sudo().update_timesheet(
                    timesheet_id, kw.get('vals', {}),
                ),
            )
        # DELETE
        return call_and_log(
            '/ess/api/timesheets/<id>',
            lambda: request.env['account.analytic.line'].sudo().delete_timesheet(timesheet_id),
        )

    @http.route('/ess/api/timesheets', type='http', auth='none', methods=['GET', 'POST'], csrf=False)
    def timesheets(self):
        if not _FEATURES_ENABLED:
            return _disabled()
        kw = get_body()
        employee_id = kw.get('employee_id') or get_auth_context().get('employee_id')
        if request.httprequest.method == 'GET':
            return call_and_log(
                '/ess/api/timesheets',
                lambda: request.env['account.analytic.line'].sudo().get_timesheets(employee_id),
            )
        return call_and_log(
            '/ess/api/timesheets',
            lambda: request.env['account.analytic.line'].sudo().log_timesheet(
                employee_id,
                kw.get('task_id'),
                kw.get('date'),
                kw.get('unit_amount'),
                kw.get('name', '/'),
            ),
        )

    @http.route('/ess/api/timesheets/daily', type='http', auth='none', methods=['GET', 'POST'], csrf=False)
    def timesheet_daily(self):
        if not _FEATURES_ENABLED:
            return _disabled()
        kw = get_body()
        employee_id = kw.get('employee_id') or get_auth_context().get('employee_id')
        return call_and_log(
            '/ess/api/timesheets/daily',
            lambda: request.env['account.analytic.line'].sudo().get_daily_timesheet(
                employee_id, kw.get('date'),
            ),
        )

    @http.route('/ess/api/timesheets/weekly', type='http', auth='none', methods=['GET', 'POST'], csrf=False)
    def timesheet_weekly(self):
        if not _FEATURES_ENABLED:
            return _disabled()
        kw = get_body()
        employee_id = kw.get('employee_id') or get_auth_context().get('employee_id')
        return call_and_log(
            '/ess/api/timesheets/weekly',
            lambda: request.env['account.analytic.line'].sudo().get_weekly_timesheet(
                employee_id, kw.get('week_start'),
            ),
        )
