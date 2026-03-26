from odoo import http
from odoo.http import request
from .utils import call_and_log, get_body


class AttendanceController(http.Controller):

    @http.route('/ess/api/attendance/summary', type='http', auth='none', methods=['GET', 'POST'], csrf=False)
    def summary(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/attendance/summary',
            lambda: request.env['hr.attendance'].sudo().get_attendance_status(employee_id),
        )

    @http.route('/ess/api/attendance/check-in', type='http', auth='none', methods=['POST'], csrf=False)
    def check_in(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/attendance/check-in',
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
            '/ess/api/attendance/check-out',
            lambda: request.env['hr.attendance'].sudo().ess_check_out(
                employee_id,
                kw.get('timestamp'),
                kw.get('latitude', 0.0),
                kw.get('longitude', 0.0),
            ),
        )

    @http.route('/ess/api/attendance/history', type='http', auth='none', methods=['GET', 'POST'], csrf=False)
    def history(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/attendance/history',
            lambda: request.env['hr.attendance'].sudo().get_attendance_history(
                employee_id,
                kw.get('date_from'),
                kw.get('date_to'),
                kw.get('page', 1),
                kw.get('page_size', 20),
            ),
        )

    @http.route('/ess/api/attendance/daily-sheet', type='http', auth='none', methods=['GET', 'POST'], csrf=False)
    def daily_sheet(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/attendance/daily-sheet',
            lambda: request.env['hr.attendance'].sudo().get_daily_sheet(employee_id, kw.get('date')),
        )

    @http.route('/ess/api/attendance/monthly-sheet', type='http', auth='none', methods=['GET', 'POST'], csrf=False)
    def monthly_sheet(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/attendance/monthly-sheet',
            lambda: request.env['hr.attendance'].sudo().get_monthly_sheet(
                employee_id, kw.get('year'), kw.get('month'),
            ),
        )

    @http.route('/ess/api/attendance/team', type='http', auth='none', methods=['GET', 'POST'], csrf=False)
    def team(self):
        kw = get_body()
        manager_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/attendance/team',
            lambda: [],  # stub — team attendance view for manager
        )

    @http.route('/ess/api/attendance/manual', type='http', auth='none', methods=['POST'], csrf=False)
    def manual(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/attendance/manual',
            lambda: {},  # stub — manual attendance entry for HR
        )
