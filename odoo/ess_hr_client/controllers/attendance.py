from odoo import http
from odoo.http import request
from .utils import call_and_log, get_body, get_auth_context


class AttendanceController(http.Controller):

    @http.route('/ess/api/attendance/summary', type='http', auth='none', methods=['GET', 'POST'], csrf=False, readonly=False)
    def summary(self):
        kw = get_body()
        employee_id = kw.get('employee_id') or get_auth_context().get('employee_id')
        return call_and_log(
            '/ess/api/attendance/summary',
            lambda: request.env['hr.attendance'].sudo().get_attendance_status(employee_id),
        )

    @http.route('/ess/api/attendance/check-in', type='http', auth='none', methods=['POST'], csrf=False, readonly=False)
    def check_in(self):
        kw = get_body()
        employee_id = kw.get('employee_id') or get_auth_context().get('employee_id')
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

    @http.route('/ess/api/attendance/check-out', type='http', auth='none', methods=['POST'], csrf=False, readonly=False)
    def ess_checkout(self):
        import traceback
        import logging
        _log = logging.getLogger('ess.checkout')
        try:
            kw = get_body()
            employee_id = kw.get('employee_id') or get_auth_context().get('employee_id')
            return call_and_log(
                '/ess/api/attendance/check-out',
                lambda: request.env['hr.attendance'].sudo().ess_check_out(
                    employee_id,
                    kw.get('timestamp'),
                    kw.get('latitude', 0.0),
                    kw.get('longitude', 0.0),
                ),
            )
        except Exception as e:
            _log.error('ESS checkout outer exception: %s\n%s', e, traceback.format_exc())
            return request.make_response(
                '{"success":false,"error":{"code":"SERVER_ERROR","message":"' + str(e).replace('"', '') + '"}}',
                headers=[('Content-Type', 'application/json')],
                status=500,
            )

    @http.route('/ess/api/attendance/history', type='http', auth='none', methods=['GET', 'POST'], csrf=False, readonly=False)
    def history(self):
        kw = get_body()
        employee_id = kw.get('employee_id') or get_auth_context().get('employee_id')
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

    @http.route('/ess/api/attendance/daily-sheet', type='http', auth='none', methods=['GET', 'POST'], csrf=False, readonly=False)
    def daily_sheet(self):
        kw = get_body()
        employee_id = kw.get('employee_id') or get_auth_context().get('employee_id')
        return call_and_log(
            '/ess/api/attendance/daily-sheet',
            lambda: request.env['hr.attendance'].sudo().get_daily_sheet(employee_id, kw.get('date')),
        )

    @http.route('/ess/api/attendance/monthly-sheet', type='http', auth='none', methods=['GET', 'POST'], csrf=False, readonly=False)
    def monthly_sheet(self):
        kw = get_body()
        employee_id = kw.get('employee_id') or get_auth_context().get('employee_id')
        return call_and_log(
            '/ess/api/attendance/monthly-sheet',
            lambda: request.env['hr.attendance'].sudo().get_monthly_sheet(
                employee_id, kw.get('year'), kw.get('month'),
            ),
        )

    @http.route('/ess/api/attendance/team', type='http', auth='none', methods=['GET', 'POST'], csrf=False, readonly=False)
    def team(self):
        kw = get_body()
        manager_id = kw.get('employee_id') or get_auth_context().get('employee_id')
        return call_and_log(
            '/ess/api/attendance/team',
            lambda: request.env['hr.attendance'].sudo().get_team_attendance(
                manager_id, kw.get('date'),
            ),
        )

    @http.route('/ess/api/attendance/manual', type='http', auth='none', methods=['POST'], csrf=False, readonly=False)
    def manual(self):
        kw = get_body()
        employee_id = kw.get('employee_id') or get_auth_context().get('employee_id')
        return call_and_log(
            '/ess/api/attendance/manual',
            lambda: request.env['hr.attendance'].sudo().create_manual_attendance(
                employee_id,
                kw.get('check_in'),
                kw.get('check_out'),
                kw.get('latitude', 0.0),
                kw.get('longitude', 0.0),
            ),
        )
