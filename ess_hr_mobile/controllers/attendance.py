from odoo import http
from odoo.http import request

from .utils import call_and_log, get_body


class AttendanceController(http.Controller):

    @http.route('/ess/api/attendance/check-in', type='http', auth='none', methods=['POST'], csrf=False)
    def check_in(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/attendance/check-in', employee_id,
            lambda: request.env['hr.attendance'].sudo().ess_check_in(
                employee_id,
                kw.get('timestamp'),
                kw.get('latitude', 0.0),
                kw.get('longitude', 0.0),
                kw.get('task_id', False),
            ),
        )

    @http.route('/ess/api/attendance/check-out', type='http', auth='none', methods=['POST'], csrf=False)
    def check_out(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/attendance/check-out', employee_id,
            lambda: request.env['hr.attendance'].sudo().ess_check_out(
                employee_id,
                kw.get('timestamp'),
                kw.get('latitude', 0.0),
                kw.get('longitude', 0.0),
            ),
        )

    @http.route('/ess/api/attendance/status', type='http', auth='none', methods=['POST'], csrf=False)
    def status(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/attendance/status', employee_id,
            lambda: request.env['hr.attendance'].sudo().get_attendance_status(employee_id),
        )

    @http.route('/ess/api/attendance/history', type='http', auth='none', methods=['POST'], csrf=False)
    def history(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/attendance/history', employee_id,
            lambda: request.env['hr.attendance'].sudo().get_attendance_history(
                employee_id,
                kw.get('date_from'),
                kw.get('date_to'),
                kw.get('page', 1),
                kw.get('page_size', 20),
            ),
        )

    @http.route('/ess/api/attendance/daily-sheet', type='http', auth='none', methods=['POST'], csrf=False)
    def daily_sheet(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/attendance/daily-sheet', employee_id,
            lambda: request.env['hr.attendance'].sudo().get_daily_sheet(employee_id, kw.get('date')),
        )

    @http.route('/ess/api/attendance/monthly-sheet', type='http', auth='none', methods=['POST'], csrf=False)
    def monthly_sheet(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/attendance/monthly-sheet', employee_id,
            lambda: request.env['hr.attendance'].sudo().get_monthly_sheet(
                employee_id, kw.get('year'), kw.get('month'),
            ),
        )
