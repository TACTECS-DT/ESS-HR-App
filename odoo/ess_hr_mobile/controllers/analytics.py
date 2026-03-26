from odoo import http
from odoo.http import request

from .utils import call_and_log, get_body


class AnalyticsController(http.Controller):

    @http.route('/ess/api/analytics', type='http', auth='none', methods=['GET', 'POST'], csrf=False)
    def summary(self):
        kw = get_body()
        return call_and_log(
            '/ess/api/analytics',
            lambda: {},  # stub — top-level analytics summary
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
