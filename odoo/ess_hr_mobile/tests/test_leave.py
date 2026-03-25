from odoo.tests.common import TransactionCase
from odoo.exceptions import UserError, ValidationError


class TestLeave(TransactionCase):

    def setUp(self):
        super().setUp()
        self.company = self.env.ref('base.main_company')
        self.employee = self.env['hr.employee'].create({
            'name': 'Leave Test Employee',
            'company_id': self.company.id,
        })
        self.manager = self.env['hr.employee'].create({
            'name': 'Leave Manager',
            'company_id': self.company.id,
        })
        manager_user = self.env['res.users'].create({
            'name': 'Leave Manager User',
            'login': 'leave_mgr@test.com',
            'groups_id': [(6, 0, [
                self.env.ref('base.group_user').id,
                self.env.ref('hr_holidays.group_hr_holidays_manager').id,
            ])],
        })
        self.manager.user_id = manager_user.id

        self.leave_type = self.env['hr.leave.type'].create({
            'name': 'Annual Leave Test',
            'requires_allocation': 'no',
            'leave_validation_type': 'no_validation',
            'company_id': self.company.id,
        })
        self.leave_model = self.env['hr.leave']

    def test_create_leave_request(self):
        """create_leave_request creates a leave and returns a dict with the correct employee."""
        result = self.leave_model.create_leave_request(
            self.employee.id,
            self.leave_type.id,
            '2026-04-10',
            '2026-04-12',
        )
        self.assertIsInstance(result, dict)
        self.assertEqual(result['employee_id'], self.employee.id)
        self.assertEqual(result['leave_type_id'], self.leave_type.id)

    def test_create_leave_invalid_dates_raises(self):
        """create_leave_request raises ValidationError when date_from > date_to."""
        with self.assertRaises(ValidationError):
            self.leave_model.create_leave_request(
                self.employee.id, self.leave_type.id, '2026-04-15', '2026-04-10'
            )

    def test_create_leave_missing_dates_raises(self):
        """create_leave_request raises ValidationError when dates are missing."""
        with self.assertRaises(ValidationError):
            self.leave_model.create_leave_request(
                self.employee.id, self.leave_type.id, '', ''
            )

    def test_get_leave_requests_returns_list(self):
        """get_leave_requests returns a list (possibly empty) for a valid employee."""
        result = self.leave_model.get_leave_requests(self.employee.id)
        self.assertIsInstance(result, list)

    def test_get_leave_requests_after_create(self):
        """get_leave_requests returns the newly created leave."""
        self.leave_model.create_leave_request(
            self.employee.id, self.leave_type.id, '2026-04-10', '2026-04-11'
        )
        result = self.leave_model.get_leave_requests(self.employee.id)
        self.assertGreater(len(result), 0)

    def test_get_leave_balance_returns_list(self):
        """get_leave_balance returns a list of balance dicts for the employee."""
        result = self.leave_model.get_leave_balance(self.employee.id)
        self.assertIsInstance(result, list)
        if result:
            self.assertIn('leave_type_id', result[0])
            self.assertIn('remaining_leaves', result[0])

    def test_get_leave_balance_invalid_employee_raises(self):
        """get_leave_balance raises UserError for a non-existent employee ID."""
        with self.assertRaises(UserError):
            self.leave_model.get_leave_balance(999999)

    def test_reset_leave_to_draft(self):
        """reset_leave_to_draft returns True without error for a draft leave."""
        leave = self.leave_model.create_leave_request(
            self.employee.id, self.leave_type.id, '2026-04-20', '2026-04-21'
        )
        result = self.leave_model.reset_leave_to_draft(leave['id'])
        self.assertTrue(result)

    def test_get_leave_types_returns_list(self):
        """get_leave_types returns a list with at least the test leave type."""
        result = self.env['hr.leave.type'].get_leave_types(self.company.id)
        self.assertIsInstance(result, list)
        ids = [lt['id'] for lt in result]
        self.assertIn(self.leave_type.id, ids)

    def test_get_leave_request_detail(self):
        """get_leave_request_detail returns a dict with approval_history key."""
        leave = self.leave_model.create_leave_request(
            self.employee.id, self.leave_type.id, '2026-04-22', '2026-04-23'
        )
        detail = self.leave_model.get_leave_request_detail(leave['id'])
        self.assertIn('approval_history', detail)
        self.assertIsInstance(detail['approval_history'], list)
