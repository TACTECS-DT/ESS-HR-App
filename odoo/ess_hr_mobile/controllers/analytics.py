from odoo import http
from odoo.http import request

from .utils import call_and_log, get_body


def _build_analytics_summary(req, date_from=None, date_to=None):
    """Aggregate top-level analytics figures from ess.api.log and HR models."""
    env = req.env
    log = env['ess.api.log'].sudo()
    domain = log._build_date_domain(date_from, date_to)

    all_logs = log.search(domain)
    total_requests = len(all_logs)
    total_errors = sum(1 for l in all_logs if l.status == 'error')
    total_success = total_requests - total_errors
    avg_duration = round(
        sum(l.duration_ms for l in all_logs) / total_requests, 1
    ) if total_requests else 0

    # Active employees (have made at least one request)
    active_emp_ids = set(l.employee_id.id for l in all_logs if l.employee_id)

    # Leave requests in period
    leave_domain = [('state', 'not in', ('draft', 'cancel'))]
    if date_from:
        leave_domain.append(('date_from', '>=', date_from))
    if date_to:
        leave_domain.append(('date_from', '<=', date_to))
    leave_count = env['hr.leave'].sudo().search_count(leave_domain)

    return {
        'total_requests': total_requests,
        'total_success': total_success,
        'total_errors': total_errors,
        'error_rate': round(total_errors / total_requests * 100, 1) if total_requests else 0,
        'avg_duration_ms': avg_duration,
        'active_employees': len(active_emp_ids),
        'leave_requests': leave_count,
        'date_from': date_from,
        'date_to': date_to,
    }


class AnalyticsController(http.Controller):

    @http.route('/ess/api/analytics', type='http', auth='none', methods=['GET', 'POST'], csrf=False)
    def summary(self):
        kw = get_body()
        date_from = kw.get('date_from')
        date_to = kw.get('date_to')
        return call_and_log(
            '/ess/api/analytics',
            lambda: _build_analytics_summary(request, date_from, date_to),
        )

    @http.route('/ess/api/analytics/module-stats', type='http', auth='none', methods=['POST'], csrf=False)
    def module_stats(self):
        kw = get_body()
        return call_and_log(
            '/ess/api/analytics/module-stats',
            lambda: request.env['ess.api.log'].sudo().get_module_stats(
                kw.get('date_from'), kw.get('date_to'),
            ),
        )

    @http.route('/ess/api/analytics/employee-activity', type='http', auth='none', methods=['POST'], csrf=False)
    def employee_activity(self):
        kw = get_body()
        return call_and_log(
            '/ess/api/analytics/employee-activity',
            lambda: request.env['ess.api.log'].sudo().get_employee_activity(
                kw.get('date_from'), kw.get('date_to'), kw.get('limit', 20),
            ),
        )

    @http.route('/ess/api/analytics/hourly-distribution', type='http', auth='none', methods=['POST'], csrf=False)
    def hourly_distribution(self):
        kw = get_body()
        return call_and_log(
            '/ess/api/analytics/hourly-distribution',
            lambda: request.env['ess.api.log'].sudo().get_hourly_distribution(
                kw.get('date_from'), kw.get('date_to'),
            ),
        )

    @http.route('/ess/api/analytics/error-summary', type='http', auth='none', methods=['POST'], csrf=False)
    def error_summary(self):
        kw = get_body()
        return call_and_log(
            '/ess/api/analytics/error-summary',
            lambda: request.env['ess.api.log'].sudo().get_error_summary(
                kw.get('date_from'), kw.get('date_to'),
            ),
        )

    @http.route('/ess/api/analytics/daily-totals', type='http', auth='none', methods=['POST'], csrf=False)
    def daily_totals(self):
        kw = get_body()
        return call_and_log(
            '/ess/api/analytics/daily-totals',
            lambda: request.env['ess.api.log'].sudo().get_daily_totals(
                kw.get('date_from'), kw.get('date_to'),
            ),
        )
