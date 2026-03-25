from odoo.tests.common import TransactionCase
from odoo.exceptions import UserError


class TestExpense(TransactionCase):

    def setUp(self):
        super().setUp()
        self.company = self.env.ref('base.main_company')
        self.employee = self.env['hr.employee'].create({
            'name': 'Expense Test Employee',
            'company_id': self.company.id,
        })
        user = self.env['res.users'].create({
            'name': 'Expense User',
            'login': 'expense_user@test.com',
            'groups_id': [(6, 0, [
                self.env.ref('base.group_user').id,
                self.env.ref('hr_expense.group_hr_expense_user').id,
            ])],
        })
        self.employee.user_id = user.id

        self.product = self.env['product.product'].create({
            'name': 'Travel Expense',
            'can_be_expensed': True,
            'type': 'service',
        })
        self.currency = self.env.ref('base.USD')
        self.expense_model = self.env['hr.expense']

    def _create_test_expense(self):
        """Helper to create a standard test expense."""
        return self.expense_model.create_expense(
            employee_id=self.employee.id,
            product_id=self.product.id,
            total_amount=100.0,
            currency_id=self.currency.id,
            tax_ids=[],
            payment_mode='own_account',
            name='Hotel Stay',
            date='2026-03-01',
        )

    def test_create_expense_returns_dict(self):
        """create_expense returns a dict with correct employee and amount."""
        result = self._create_test_expense()
        self.assertIsInstance(result, dict)
        self.assertEqual(result['employee_id'], self.employee.id)
        self.assertEqual(result['total_amount'], 100.0)

    def test_create_expense_invalid_employee_raises(self):
        """create_expense raises UserError for a non-existent employee."""
        with self.assertRaises(UserError):
            self.expense_model.create_expense(
                999999, self.product.id, 50.0, self.currency.id, [], 'own_account', 'Test', '2026-03-01'
            )

    def test_get_expenses_returns_list(self):
        """get_expenses returns a list for a valid employee."""
        self._create_test_expense()
        result = self.expense_model.get_expenses(self.employee.id)
        self.assertIsInstance(result, list)
        self.assertGreater(len(result), 0)

    def test_get_expenses_with_state_filter(self):
        """get_expenses with state_filter='draft' returns only draft expenses."""
        self._create_test_expense()
        result = self.expense_model.get_expenses(self.employee.id, state_filter='draft')
        for exp in result:
            self.assertEqual(exp['state'], 'draft')

    def test_update_expense(self):
        """update_expense correctly updates the expense name."""
        expense = self._create_test_expense()
        updated = self.expense_model.update_expense(expense['id'], {'name': 'Updated Name'})
        self.assertEqual(updated['name'], 'Updated Name')

    def test_update_non_draft_expense_raises(self):
        """update_expense raises UserError when trying to update a non-draft expense."""
        expense_rec = self._create_test_expense()
        exp = self.expense_model.browse(expense_rec['id'])
        exp.sudo().write({'state': 'reported'})
        with self.assertRaises(UserError):
            self.expense_model.update_expense(expense_rec['id'], {'name': 'Should Fail'})

    def test_delete_expense(self):
        """delete_expense removes the expense record and returns True."""
        expense = self._create_test_expense()
        result = self.expense_model.delete_expense(expense['id'])
        self.assertTrue(result)
        remaining = self.expense_model.browse(expense['id'])
        self.assertFalse(remaining.exists())

    def test_delete_non_draft_expense_raises(self):
        """delete_expense raises UserError for a submitted expense."""
        expense_rec = self._create_test_expense()
        exp = self.expense_model.browse(expense_rec['id'])
        exp.sudo().write({'state': 'reported'})
        with self.assertRaises(UserError):
            self.expense_model.delete_expense(expense_rec['id'])

    def test_submit_expense_creates_sheet(self):
        """ess_submit_expense creates an expense sheet and returns sheet dict."""
        expense = self._create_test_expense()
        result = self.expense_model.ess_submit_expense(expense['id'])
        self.assertIsInstance(result, dict)
        self.assertIn('id', result)
        self.assertIn('state', result)

    def test_get_expense_categories_returns_list(self):
        """get_expense_categories returns a list of expensable products."""
        result = self.expense_model.get_expense_categories()
        self.assertIsInstance(result, list)
        ids = [p['id'] for p in result]
        self.assertIn(self.product.id, ids)

    def test_get_currencies_returns_list(self):
        """get_currencies returns at least one active currency."""
        result = self.expense_model.get_currencies()
        self.assertIsInstance(result, list)
        self.assertGreater(len(result), 0)
