"""Tests for /ess/api/attendance/* endpoints."""
from odoo.tests import tagged
from .common import EssClientTestCase


@tagged('post_install', '-at_install', 'ess_api', 'ess_attendance')
class TestAttendance(EssClientTestCase):

    def setUp(self):
        super().setUp()
        # Ensure no open attendance before each test (unlink avoids work-entry hooks)
        self.env['hr.attendance'].sudo().search(
            [('employee_id', '=', self.emp_id), ('check_out', '=', False)]
        ).unlink()

    # ── Read-only endpoints ───────────────────────────────────────────────────

    def test_summary_returns_status(self):
        """GET /ess/api/attendance/summary → status dict."""
        result = self._call('GET', '/ess/api/attendance/summary')
        data = self.assertOk(result)
        self.assertHasKeys(data, ['status', 'hours_worked_today'])
        self.assertIn(data['status'], ('checked_in', 'checked_out'))

    def test_history_returns_list(self):
        """GET /ess/api/attendance/history → paginated attendance list."""
        result = self._call('GET', '/ess/api/attendance/history')
        data = self.assertOk(result)
        self.assertHasKeys(data, ['total', 'page', 'page_size', 'records'])
        self.assertIsInstance(data['records'], list)

    def test_daily_sheet_returns_list(self):
        """GET /ess/api/attendance/daily-sheet → list of attendance for today."""
        result = self._call('GET', '/ess/api/attendance/daily-sheet')
        data = self.assertOk(result)
        self.assertIsInstance(data, list)

    def test_monthly_sheet_returns_days(self):
        """GET /ess/api/attendance/monthly-sheet → list of day dicts."""
        result = self._call('GET', '/ess/api/attendance/monthly-sheet')
        data = self.assertOk(result)
        self.assertIsInstance(data, list)
        if data:
            day = data[0]
            self.assertHasKeys(day, ['date', 'status', 'total_hours'])

    def test_team_attendance(self):
        """GET /ess/api/attendance/team → team list (may be empty if no subordinates)."""
        result = self._call('GET', '/ess/api/attendance/team')
        data = self.assertOk(result)
        self.assertIsInstance(data, list)

    # ── Check-in / Check-out ──────────────────────────────────────────────────

    def test_check_in_creates_record(self):
        """POST /ess/api/attendance/check-in → new attendance record."""
        result = self._call('POST', '/ess/api/attendance/check-in', {
            'latitude':  25.2048,
            'longitude': 55.2708,
        })
        data = self.assertOk(result)
        self.assertHasKeys(data, ['id', 'check_in', 'employee_id'])
        self.assertEqual(data['employee_id'], self.emp_id)
        # Clean up
        self.env['hr.attendance'].sudo().browse(data['id']).unlink()

    def test_check_in_without_timestamp_defaults_to_now(self):
        """POST /ess/api/attendance/check-in without timestamp → uses server time."""
        result = self._call('POST', '/ess/api/attendance/check-in', {})
        data = self.assertOk(result)
        self.assertTrue(data.get('check_in'), 'check_in timestamp should not be empty')
        self.env['hr.attendance'].sudo().browse(data['id']).unlink()

    def test_double_check_in_returns_existing(self):
        """POST /ess/api/attendance/check-in when already checked in → returns existing."""
        r1 = self._call('POST', '/ess/api/attendance/check-in', {})
        self.assertOk(r1)
        r2 = self._call('POST', '/ess/api/attendance/check-in', {})
        data2 = self.assertOk(r2)
        self.assertTrue(data2.get('already_checked_in'), 'Expected already_checked_in flag')
        # Clean up
        self.env['hr.attendance'].sudo().browse(r1['data']['id']).unlink()

    def test_check_in_then_check_out(self):
        """Full cycle: check-in then check-out → worked_hours >= 0."""
        r_in = self._call('POST', '/ess/api/attendance/check-in',
                          {'latitude': 25.2, 'longitude': 55.3})
        d_in = self.assertOk(r_in)

        r_out = self._call('POST', '/ess/api/attendance/check-out',
                           {'latitude': 25.2, 'longitude': 55.3})
        d_out = self.assertOk(r_out)
        self.assertHasKeys(d_out, ['id', 'check_out', 'worked_hours'])
        self.assertIsNotNone(d_out['check_out'])
        self.env['hr.attendance'].sudo().browse(d_in['id']).unlink()

    def test_check_out_without_check_in_fails(self):
        """POST /ess/api/attendance/check-out when not checked in → error."""
        result = self._call('POST', '/ess/api/attendance/check-out', {})
        self.assertErr(result)

    # ── Manual attendance ─────────────────────────────────────────────────────

    def test_manual_attendance_creates_record(self):
        """POST /ess/api/attendance/manual → creates attendance record."""
        result = self._call('POST', '/ess/api/attendance/manual', {
            'check_in':  '2026-02-15 08:00:00',
            'check_out': '2026-02-15 17:00:00',
        })
        data = self.assertOk(result)
        self.assertHasKeys(data, ['id', 'check_in', 'check_out', 'worked_hours'])
        self.assertGreater(data['worked_hours'], 0)
        self.env['hr.attendance'].sudo().browse(data['id']).unlink()
