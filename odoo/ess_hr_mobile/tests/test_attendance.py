from odoo.tests.common import TransactionCase
from odoo.exceptions import UserError
from odoo import fields


class TestAttendance(TransactionCase):

    def setUp(self):
        super().setUp()
        self.company = self.env.ref('base.main_company')
        self.employee = self.env['hr.employee'].create({
            'name': 'Attendance Test Employee',
            'company_id': self.company.id,
        })
        self.attendance_model = self.env['hr.attendance']

    def test_check_in_creates_record(self):
        """ess_check_in creates a new attendance record and returns a dict with correct employee."""
        result = self.attendance_model.ess_check_in(
            self.employee.id,
            '2026-03-25 08:00:00',
            24.7136,
            46.6753,
        )
        self.assertIsInstance(result, dict)
        self.assertEqual(result['employee_id'], self.employee.id)
        self.assertIsNotNone(result['check_in'])
        self.assertFalse(result['check_out'])

    def test_check_in_already_checked_in_raises(self):
        """ess_check_in raises UserError when employee is already checked in."""
        self.attendance_model.ess_check_in(
            self.employee.id, '2026-03-25 08:00:00', 0.0, 0.0
        )
        with self.assertRaises(UserError):
            self.attendance_model.ess_check_in(
                self.employee.id, '2026-03-25 09:00:00', 0.0, 0.0
            )

    def test_check_out_closes_record(self):
        """ess_check_out sets check_out on the open record."""
        self.attendance_model.ess_check_in(
            self.employee.id, '2026-03-25 08:00:00', 0.0, 0.0
        )
        result = self.attendance_model.ess_check_out(
            self.employee.id, '2026-03-25 17:00:00', 24.7136, 46.6753
        )
        self.assertIsNotNone(result['check_out'])
        self.assertGreater(result['worked_hours'], 0)

    def test_check_out_not_checked_in_raises(self):
        """ess_check_out raises UserError when employee has no open attendance."""
        with self.assertRaises(UserError):
            self.attendance_model.ess_check_out(
                self.employee.id, '2026-03-25 17:00:00', 0.0, 0.0
            )

    def test_get_attendance_status_not_checked_in(self):
        """get_attendance_status returns checked_in=False when no open record exists."""
        status = self.attendance_model.get_attendance_status(self.employee.id)
        self.assertFalse(status['checked_in'])
        self.assertFalse(status['check_in_time'])

    def test_get_attendance_status_checked_in(self):
        """get_attendance_status returns checked_in=True after a check-in."""
        self.attendance_model.ess_check_in(
            self.employee.id, '2026-03-25 08:00:00', 0.0, 0.0
        )
        status = self.attendance_model.get_attendance_status(self.employee.id)
        self.assertTrue(status['checked_in'])
        self.assertIsNotNone(status['check_in_time'])

    def test_get_monthly_sheet_returns_correct_day_count(self):
        """get_monthly_sheet returns exactly the number of days in the requested month."""
        sheet = self.attendance_model.get_monthly_sheet(self.employee.id, 2026, 3)
        self.assertIsInstance(sheet, list)
        self.assertEqual(len(sheet), 31)  # March has 31 days

    def test_get_monthly_sheet_day_structure(self):
        """Each entry in the monthly sheet has the expected keys."""
        sheet = self.attendance_model.get_monthly_sheet(self.employee.id, 2026, 2)
        self.assertIn('date', sheet[0])
        self.assertIn('status', sheet[0])
        self.assertIn('total_hours', sheet[0])

    def test_gps_fields_stored(self):
        """Check-in GPS coordinates are persisted on the attendance record."""
        result = self.attendance_model.ess_check_in(
            self.employee.id, '2026-03-25 08:30:00', 24.7136, 46.6753
        )
        att = self.attendance_model.browse(result['id'])
        self.assertAlmostEqual(att.gps_latitude, 24.7136, places=3)
        self.assertAlmostEqual(att.gps_longitude, 46.6753, places=3)

    def test_parse_timestamp_iso_format(self):
        """_parse_timestamp correctly parses ISO-8601 format strings."""
        att = self.attendance_model
        dt = att._parse_timestamp('2026-03-25T08:00:00')
        self.assertEqual(dt.year, 2026)
        self.assertEqual(dt.month, 3)
        self.assertEqual(dt.day, 25)
