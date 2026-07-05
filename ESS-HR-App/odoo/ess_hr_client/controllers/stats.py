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
from ..tz_utils import utc_to_iso_string


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
            'last_activity': utc_to_iso_string(log.timestamp) or None,
        })
    active_user_list.sort(key=lambda u: u['last_activity'] or '', reverse=True)

    # ── Odoo user counts by type ──────────────────────────────────────────────
    # share=False → internal (employee) users; share=True → portal users.
    # The public pseudo-user (base.public_user) is typically inactive, so we
    # count it separately via env.ref rather than relying on groups_id search.
    all_users = env['res.users'].sudo().search([('active', '=', True)])
    internal_users = all_users.filtered(lambda u: not u.share)
    portal_users = all_users.filtered(lambda u: u.share)
    try:
        public_user_ref = env.ref('base.public_user', raise_if_not_found=False)
        public_count = 1 if public_user_ref else 0
    except Exception:
        public_count = 0

    # ── Archived (inactive) users ─────────────────────────────────────────────
    archived_users = env['res.users'].with_context(active_test=False).sudo().search(
        [('active', '=', False)]
    )

    # ── Installed modules ─────────────────────────────────────────────────────
    modules = env['ir.module.module'].sudo().search(
        [('state', '=', 'installed')], order='shortdesc asc'
    )
    module_list = [
        {
            'name': mod.shortdesc or mod.name,
            'technical_name': mod.name,
            'version': mod.installed_version or '',
        }
        for mod in modules
    ]

    return {
        'employee_count': employee_count,
        'active_user_count': active_user_count,
        'employees': employee_list,
        'active_users': active_user_list,
        'odoo_user_count': len(all_users) + len(archived_users),
        'internal_user_count': len(internal_users),
        'portal_user_count': len(portal_users),
        'public_user_count': public_count,
        'archived_user_count': len(archived_users),
        'installed_modules': module_list,
    }
