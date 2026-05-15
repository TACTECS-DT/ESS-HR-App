"""
Stats endpoint — called by the ESS Admin server to collect client-side metrics.

Authentication: X-ESS-Admin-Key header (configured via ir.config_parameter ess.admin.api.key).
If the parameter is not set, the endpoint is open (for local dev).

Returns:
  employee_count      — total active employees on this Odoo instance
  active_user_count   — employees who have logged in via ESS mobile in the last 30 days
  employees           — list of active employees [{id, name, badge_id, department, job_title}]
  active_users        — list of active mobile users [{id, name, badge_id, last_activity}]
"""
import base64
from datetime import timedelta

from odoo import http
from odoo.http import request
from odoo.fields import Datetime

from .utils import call_and_log


class StatsController(http.Controller):

    @http.route('/ess/api/stats', type='http', auth='none', methods=['GET'], csrf=False, readonly=False)
    def stats(self):
        return call_and_log(
            '/ess/api/stats',
            lambda: _collect_stats(request),
        )


def _collect_stats(req):
    env = req.env

    # ── Active employees ──────────────────────────────────────────────────────
    employees = env['hr.employee'].sudo().search([('active', '=', True)], order='name asc')
    employee_count = len(employees)
    employee_list = [
        {
            'id': emp.id,
            'name': emp.name,
            'badge_id': emp.barcode or '',
            'department': emp.department_id.name if emp.department_id else '',
            'job_title': emp.job_title or (emp.job_id.name if emp.job_id else ''),
        }
        for emp in employees
    ]

    # ── Active mobile users (ESS API activity in last 30 days) ───────────────
    cutoff = Datetime.now() - timedelta(days=30)
    recent_logs = env['ess.api.log'].sudo().search([
        ('timestamp', '>=', cutoff),
        ('employee_id', '!=', False),
    ])

    # Deduplicate: keep the most recent log per employee
    seen = {}
    for log in recent_logs:
        emp_id = log.employee_id.id
        if emp_id not in seen or log.timestamp > seen[emp_id].timestamp:
            seen[emp_id] = log

    active_user_count = len(seen)
    active_user_list = []
    for log in seen.values():
        emp = log.employee_id
        active_user_list.append({
            'id': emp.id,
            'name': emp.name,
            'badge_id': emp.barcode or '',
            'last_activity': log.timestamp.strftime('%Y-%m-%dT%H:%M:%S') if log.timestamp else None,
        })
    active_user_list.sort(key=lambda u: u['last_activity'] or '', reverse=True)

    return {
        'employee_count': employee_count,
        'active_user_count': active_user_count,
        'employees': employee_list,
        'active_users': active_user_list,
    }
