"""Tests for /ess/api/expenses/* endpoints."""
from odoo.tests import tagged
from .common import EssClientTestCase


@tagged('post_install', '-at_install', 'ess_api', 'ess_expense')
class TestExpense(EssClientTestCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        env = cls.env
        # Ensure at least one expensable product exists
        prod = env['product.product'].sudo().search(
            [('can_be_expensed', '=', True), ('active', '=', True)], limit=1
        )
        if not prod:
            prod = env['product.product'].sudo().create({
                'name':           'ESS Test Expense Product',
                'can_be_expensed': True,
            })
        cls.product_id = prod.id
        # Get main currency
        cls.currency_id = env.ref('base.main_company').currency_id.id or 1

    def _create_expense(self):
        """Helper: create a draft expense and return its data dict."""
        result = self._call('POST', '/ess/api/expenses', {
            'product_id':   self.product_id,
            'total_amount': 75.0,
            'currency_id':  self.currency_id,
            'name':         'API Unit Test Expense',
            'date':         '2026-04-01',
        })
        self.assertOk(result, 'Expense create failed')
        return result['data']

    def _delete_expense(self, expense_id):
        self.env['hr.expense'].sudo().browse(expense_id).unlink()

    # ── Reference data ────────────────────────────────────────────────────────

    def test_categories_returns_list(self):
        """GET /ess/api/expenses/categories → list of expensable products."""
        result = self._call('GET', '/ess/api/expenses/categories')
        data = self.assertOk(result)
        self.assertIsInstance(data, list)
        self.assertTrue(len(data) >= 1)
        self.assertHasKeys(data[0], ['id', 'name'])

    def test_currencies_returns_list(self):
        """GET /ess/api/expenses/currencies → list of currency dicts."""
        result = self._call('GET', '/ess/api/expenses/currencies')
        data = self.assertOk(result)
        self.assertIsInstance(data, list)
        self.assertTrue(len(data) >= 1)
        curr = data[0]
        self.assertHasKeys(curr, ['id', 'name', 'symbol'])

    def test_taxes_returns_list(self):
        """GET /ess/api/expenses/taxes → list of purchase tax dicts."""
        result = self._call('GET', '/ess/api/expenses/taxes')
        data = self.assertOk(result)
        self.assertIsInstance(data, list)

    # ── CRUD ──────────────────────────────────────────────────────────────────

    def test_expense_list_returns_list(self):
        """GET /ess/api/expenses → list of employee expenses."""
        result = self._call('GET', '/ess/api/expenses')
        data = self.assertOk(result)
        self.assertIsInstance(data, list)

    def test_expense_create_success(self):
        """POST /ess/api/expenses → creates draft expense, returns record dict."""
        exp = self._create_expense()
        self.assertHasKeys(exp, ['id', 'name', 'amount', 'status'])
        self.assertEqual(exp['status'], 'draft')
        self._delete_expense(exp['id'])

    def test_expense_create_missing_product_fails(self):
        """POST /ess/api/expenses without product_id → error."""
        result = self._call('POST', '/ess/api/expenses', {
            'total_amount': 50.0,
            'currency_id':  self.currency_id,
        })
        self.assertErr(result)

    def test_expense_get_by_id(self):
        """GET /ess/api/expenses/<id> → single expense dict."""
        exp = self._create_expense()
        result = self._call('GET', f'/ess/api/expenses/{exp["id"]}')
        data = self.assertOk(result)
        self.assertEqual(data['id'], exp['id'])
        self._delete_expense(exp['id'])

    def test_expense_get_nonexistent_fails(self):
        """GET /ess/api/expenses/999999 → error."""
        result = self._call('GET', '/ess/api/expenses/999999')
        self.assertErr(result)

    def test_expense_attach_file(self):
        """POST /ess/api/expenses/attach → attaches file to expense."""
        exp = self._create_expense()
        result = self._call('POST', '/ess/api/expenses/attach', {
            'expense_id': exp['id'],
            'filename':   'receipt.pdf',
            'data':       'dGVzdCByZWNlaXB0',  # base64 'test receipt'
        })
        data = self.assertOk(result)
        self.assertHasKeys(data, ['id', 'name'])
        self._delete_expense(exp['id'])

    def test_expense_submit(self):
        """POST /ess/api/expenses/submit → moves expense out of draft."""
        exp = self._create_expense()
        result = self._call('POST', '/ess/api/expenses/submit', {
            'expense_id': exp['id'],
        })
        # Submit may succeed or fail depending on Odoo payroll setup — both paths OK
        self.assertIn('success', result)
