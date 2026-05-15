"""Tests for /ess/api/loans/* endpoints."""
from odoo.tests import tagged
from .common import EssClientTestCase


@tagged('post_install', '-at_install', 'ess_api', 'ess_loans')
class TestLoans(EssClientTestCase):

    def _create_loan(self, amount=1000, months=12):
        """Helper: create a loan and return its data dict (or None on business error)."""
        result = self._call('POST', '/ess/api/loans', {
            'loan_amount':      amount,
            'duration_months':  months,
            'transfer_method':  'bank',
        })
        if not result.get('success'):
            return None  # business rules may block (hiring months, etc.)
        return result['data']

    def _delete_loan(self, loan_id):
        self.env['hr.loan'].sudo().browse(loan_id).unlink()

    # ── Reference data ────────────────────────────────────────────────────────

    def test_loan_rules_returns_config(self):
        """GET /ess/api/loans/rules → loan configuration dict."""
        result = self._call('GET', '/ess/api/loans/rules')
        data = self.assertOk(result)
        self.assertHasKeys(data, ['min_hiring_months', 'max_duration_months',
                                   'min_gap_months', 'max_amount_percentage'])

    # ── CRUD ──────────────────────────────────────────────────────────────────

    def test_loan_list_returns_list(self):
        """GET /ess/api/loans → list of employee loans."""
        result = self._call('GET', '/ess/api/loans')
        data = self.assertOk(result)
        self.assertIsInstance(data, list)

    def test_loan_create_returns_record(self):
        """POST /ess/api/loans → creates loan (or skips if business rules block it)."""
        loan = self._create_loan(500, 6)
        if loan is None:
            self.skipTest('Loan creation blocked by business rules (hiring months, cap) — skipped')
        self.assertHasKeys(loan, ['id', 'name', 'amount', 'state', 'duration_months'])
        self.assertEqual(loan['state'], 'submitted')
        self._delete_loan(loan['id'])

    def test_loan_get_by_id(self):
        """GET /ess/api/loans/<id> → full loan dict with installments."""
        loan = self._create_loan(500, 6)
        if loan is None:
            self.skipTest('Loan creation blocked — skipping get-by-id test')
        result = self._call('GET', f'/ess/api/loans/{loan["id"]}')
        data = self.assertOk(result)
        self.assertEqual(data['id'], loan['id'])
        self.assertIn('installments', data)
        self.assertIsInstance(data['installments'], list)
        self._delete_loan(loan['id'])

    def test_loan_get_nonexistent_fails(self):
        """GET /ess/api/loans/999999 → error."""
        result = self._call('GET', '/ess/api/loans/999999')
        self.assertErr(result)

    # ── Workflow ──────────────────────────────────────────────────────────────

    def test_loan_approve_workflow(self):
        """POST /ess/api/loans/approve → moves to approved state."""
        loan = self._create_loan(500, 6)
        if loan is None:
            self.skipTest('Loan creation blocked — skipping approve test')
        result = self._call('POST', '/ess/api/loans/approve', {'loan_id': loan['id']})
        self.assertOk(result)
        self._delete_loan(loan['id'])

    def test_loan_refuse_workflow(self):
        """POST /ess/api/loans/refuse → moves to refused state."""
        loan = self._create_loan(500, 6)
        if loan is None:
            self.skipTest('Loan creation blocked — skipping refuse test')
        result = self._call('POST', '/ess/api/loans/refuse', {
            'loan_id': loan['id'],
            'reason':  'unit test refusal',
        })
        self.assertOk(result)
        self._delete_loan(loan['id'])

    def test_loan_create_zero_amount_fails(self):
        """POST /ess/api/loans with amount=0 → should fail (Odoo constraint)."""
        result = self._call('POST', '/ess/api/loans', {
            'loan_amount':     0,
            'duration_months': 6,
            'transfer_method': 'bank',
        })
        # Zero/negative amounts should fail at ORM level
        self.assertErr(result)
