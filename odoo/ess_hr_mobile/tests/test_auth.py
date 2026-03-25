from odoo.tests.common import TransactionCase
from odoo.exceptions import UserError


class TestAuth(TransactionCase):

    def setUp(self):
        super().setUp()
        self.company = self.env.ref('base.main_company')
        self.employee_model = self.env['hr.employee']

        self.employee = self.employee_model.create({
            'name': 'Auth Test Employee',
            'barcode': 'BADGE123',
            'company_id': self.company.id,
        })
        raw_pin = '1234'
        self.employee.mobile_pin = self.employee_model._hash_pin(raw_pin)
        self.raw_pin = raw_pin

    def test_authenticate_badge_pin_success(self):
        """authenticate_badge_pin returns employee dict on correct badge + PIN."""
        result = self.employee_model.authenticate_badge_pin(
            'BADGE123', self.raw_pin, self.company.id
        )
        self.assertIsInstance(result, dict)
        self.assertEqual(result['id'], self.employee.id)
        self.assertEqual(result['name'], 'Auth Test Employee')

    def test_authenticate_badge_pin_wrong_pin_raises(self):
        """authenticate_badge_pin raises UserError for wrong PIN."""
        with self.assertRaises(UserError):
            self.employee_model.authenticate_badge_pin('BADGE123', '9999', self.company.id)

    def test_authenticate_badge_pin_invalid_badge_raises(self):
        """authenticate_badge_pin raises UserError for unknown badge ID."""
        with self.assertRaises(UserError):
            self.employee_model.authenticate_badge_pin('NO-BADGE', self.raw_pin, self.company.id)

    def test_authenticate_no_pin_set_raises(self):
        """authenticate_badge_pin raises if employee has no PIN set."""
        emp = self.employee_model.create({
            'name': 'No PIN Employee',
            'barcode': 'BADGE_NOPIN',
            'company_id': self.company.id,
        })
        with self.assertRaises(UserError):
            self.employee_model.authenticate_badge_pin('BADGE_NOPIN', '1234', self.company.id)

    def test_get_employee_by_odoo_user(self):
        """get_employee_by_odoo_user returns employee dict for linked user."""
        user = self.env['res.users'].create({
            'name': 'Employee User',
            'login': 'emp_test_user@test.com',
            'groups_id': [(6, 0, [self.env.ref('base.group_user').id])],
        })
        self.employee.user_id = user.id
        result = self.employee_model.get_employee_by_odoo_user(user.id)
        self.assertEqual(result['id'], self.employee.id)

    def test_get_employee_by_odoo_user_not_found_raises(self):
        """get_employee_by_odoo_user raises UserError for unlinked user ID."""
        with self.assertRaises(UserError):
            self.employee_model.get_employee_by_odoo_user(999999)

    def test_reset_mobile_pin(self):
        """reset_mobile_pin stores a new hashed PIN and the new PIN validates correctly."""
        result = self.employee_model.reset_mobile_pin(self.employee.id, '5678')
        self.assertTrue(result)
        self.employee.invalidate_recordset()
        self.assertTrue(
            self.employee_model._verify_pin('5678', self.employee.mobile_pin)
        )

    def test_reset_mobile_pin_too_short_raises(self):
        """reset_mobile_pin raises UserError if PIN is shorter than 4 characters."""
        with self.assertRaises(UserError):
            self.employee_model.reset_mobile_pin(self.employee.id, '12')

    def test_hash_pin_deterministic(self):
        """_hash_pin returns the same hash for the same input."""
        h1 = self.employee_model._hash_pin('abcd')
        h2 = self.employee_model._hash_pin('abcd')
        self.assertEqual(h1, h2)

    def test_verify_pin_correct(self):
        """_verify_pin returns True for the correct PIN."""
        hashed = self.employee_model._hash_pin('mysecret')
        self.assertTrue(self.employee_model._verify_pin('mysecret', hashed))

    def test_verify_pin_wrong(self):
        """_verify_pin returns False for a wrong PIN."""
        hashed = self.employee_model._hash_pin('mysecret')
        self.assertFalse(self.employee_model._verify_pin('wrongpin', hashed))
