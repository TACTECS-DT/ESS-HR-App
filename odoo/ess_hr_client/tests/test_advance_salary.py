"""Tests for /ess/api/advance-salary/* endpoints."""
from odoo.tests import tagged
from .common import EssClientTestCase


@tagged('post_install', '-at_install', 'ess_api', 'ess_advance')
class TestAdvanceSalary(EssClientTestCase):

    def _get_cap(self):
        """Return employee advance cap from the info endpoint."""
        result = self._call('GET', '/ess/api/advance-salary/info')
        if result.get('success'):
            return result['data'].get('cap', 0)
        return 0

    def _create_advance(self, amount):
        result = self._call('POST', '/ess/api/advance-salary', {'advance_amount': amount})
        if not result.get('success'):
            return None
        return result['data']

    def _delete_advance(self, adv_id):
        self.env['hr.advance.salary'].sudo().browse(adv_id).unlink()

    # ── Info ──────────────────────────────────────────────────────────────────

    def test_advance_info_returns_cap(self):
        """GET /ess/api/advance-salary/info → cap and basic_wage dict."""
        result = self._call('GET', '/ess/api/advance-salary/info')
        data = self.assertOk(result)
        self.assertHasKeys(data, ['cap', 'basic_wage'])
        self.assertGreaterEqual(data['cap'], 0)

    # ── List ──────────────────────────────────────────────────────────────────

    def test_advance_list_returns_list(self):
        """GET /ess/api/advance-salary → list of advance requests."""
        result = self._call('GET', '/ess/api/advance-salary')
        data = self.assertOk(result)
        self.assertIsInstance(data, list)

    # ── Create requires a contract ────────────────────────────────────────────

    def test_advance_create_within_cap(self):
        """POST /ess/api/advance-salary with valid amount → creates record."""
        cap = self._get_cap()
        if cap <= 0:
            self.skipTest('No active contract (cap=0) — skipping advance create test')
        amount = round(cap * 0.3, 2)
        adv = self._create_advance(amount)
        self.assertIsNotNone(adv, 'Advance create returned no data')
        self.assertHasKeys(adv, ['id', 'name', 'amount', 'state'])
        self.assertEqual(adv['state'], 'submitted')
        self._delete_advance(adv['id'])

    def test_advance_create_over_cap_fails(self):
        """POST /ess/api/advance-salary exceeding 50% cap → error."""
        cap = self._get_cap()
        if cap <= 0:
            self.skipTest('No active contract — skipping cap validation test')
        result = self._call('POST', '/ess/api/advance-salary', {
            'advance_amount': cap * 2,  # double the cap
        })
        self.assertErr(result)

    def test_advance_get_by_id(self):
        """GET /ess/api/advance-salary/<id> → single record dict."""
        cap = self._get_cap()
        if cap <= 0:
            self.skipTest('No active contract — skipping get-by-id test')
        adv = self._create_advance(round(cap * 0.3, 2))
        if not adv:
            self.skipTest('Advance create failed — skipping get-by-id')
        result = self._call('GET', f'/ess/api/advance-salary/{adv["id"]}')
        data = self.assertOk(result)
        self.assertEqual(data['id'], adv['id'])
        self._delete_advance(adv['id'])

    def test_advance_get_nonexistent_fails(self):
        """GET /ess/api/advance-salary/999999 → error."""
        result = self._call('GET', '/ess/api/advance-salary/999999')
        self.assertErr(result)

    # ── Workflow ──────────────────────────────────────────────────────────────

    def test_advance_approve_then_reset_fails(self):
        """Approve → then reset should fail (approved cannot be reset)."""
        cap = self._get_cap()
        if cap <= 0:
            self.skipTest('No active contract — skipping workflow test')
        adv = self._create_advance(round(cap * 0.3, 2))
        if not adv:
            self.skipTest('Advance create failed — skipping workflow test')

        r_approve = self._call('POST', '/ess/api/advance-salary/approve',
                               {'advance_id': adv['id']})
        self.assertOk(r_approve)

        r_reset = self._call('POST', '/ess/api/advance-salary/reset',
                             {'advance_id': adv['id']})
        self.assertErr(r_reset)  # approved cannot be reset
        self._delete_advance(adv['id'])

    def test_advance_refuse_workflow(self):
        """POST /ess/api/advance-salary/refuse → moves to refused state."""
        cap = self._get_cap()
        if cap <= 0:
            self.skipTest('No active contract — skipping refuse test')
        adv = self._create_advance(round(cap * 0.3, 2))
        if not adv:
            self.skipTest('Advance create failed')
        result = self._call('POST', '/ess/api/advance-salary/refuse', {
            'advance_id': adv['id'],
            'reason':     'unit test refusal',
        })
        self.assertOk(result)
        self._delete_advance(adv['id'])
