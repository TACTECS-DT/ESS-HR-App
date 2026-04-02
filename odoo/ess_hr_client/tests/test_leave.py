"""Tests for /ess/api/leave/* endpoints."""
from odoo.tests import tagged
from .common import EssClientTestCase


@tagged('post_install', '-at_install', 'ess_api', 'ess_leave')
class TestLeave(EssClientTestCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        # Get or create a leave type to use across tests
        env = cls.env
        lt = env['hr.leave.type'].sudo().search([('active', '=', True)], limit=1)
        if not lt:
            lt = env['hr.leave.type'].sudo().create({
                'name':               'ESS Test Leave',
                'leave_validation_type': 'no_validation',
                'requires_allocation': 'no',
            })
        cls.leave_type_id = lt.id

    def _create_leave(self, date_from='2026-06-02', date_to='2026-06-02'):
        """Helper: create a leave request and return its data dict."""
        result = self._call('POST', '/ess/api/leave/requests', {
            'leave_type_id': self.leave_type_id,
            'date_from':     date_from,
            'date_to':       date_to,
            'description':   'API unit test leave',
        })
        self.assertOk(result, 'Leave create failed')
        return result['data']

    def _delete_leave(self, leave_id):
        """Helper: force-delete a leave record directly (cleanup)."""
        rec = self.env['hr.leave'].sudo().browse(leave_id)
        if rec.exists():
            try:
                rec.sudo().action_refuse()
            except Exception:
                pass
            try:
                rec.sudo().unlink()
            except Exception:
                pass

    # ── Reference data ────────────────────────────────────────────────────────

    def test_leave_types_returns_list(self):
        """GET /ess/api/leave/types → list of leave type dicts."""
        result = self._call('GET', '/ess/api/leave/types')
        data = self.assertOk(result)
        self.assertIsInstance(data, list)
        self.assertTrue(len(data) >= 1)
        lt = data[0]
        self.assertHasKeys(lt, ['id', 'name', 'requires_allocation'])

    def test_leave_balances_returns_list(self):
        """GET /ess/api/leave/balances → per-type balance list."""
        result = self._call('GET', '/ess/api/leave/balances')
        data = self.assertOk(result)
        self.assertIsInstance(data, list)
        if data:
            self.assertHasKeys(data[0], ['leave_type_id', 'leave_type_name'])

    def test_team_balances_returns_list(self):
        """GET /ess/api/leave/team-balances → team member balance list."""
        result = self._call('GET', '/ess/api/leave/team-balances')
        data = self.assertOk(result)
        self.assertIsInstance(data, list)

    # ── CRUD ──────────────────────────────────────────────────────────────────

    def test_leave_list_returns_list(self):
        """GET /ess/api/leave/requests → leave request list."""
        result = self._call('GET', '/ess/api/leave/requests')
        data = self.assertOk(result)
        self.assertIsInstance(data, list)

    def test_leave_create_success(self):
        """POST /ess/api/leave/requests → creates leave, returns record."""
        leave = self._create_leave('2026-06-10', '2026-06-10')
        self.assertHasKeys(leave, ['id', 'state', 'employee_id', 'leave_type_id'])
        self.assertEqual(leave['employee_id'], self.emp_id)
        self._delete_leave(leave['id'])

    def test_leave_create_invalid_dates_fails(self):
        """POST /ess/api/leave/requests with reversed dates → error."""
        result = self._call('POST', '/ess/api/leave/requests', {
            'leave_type_id': self.leave_type_id,
            'date_from':     '2026-06-10',
            'date_to':       '2026-06-05',  # before date_from
        })
        self.assertErr(result)

    def test_leave_create_missing_dates_fails(self):
        """POST /ess/api/leave/requests without dates → error."""
        result = self._call('POST', '/ess/api/leave/requests', {
            'leave_type_id': self.leave_type_id,
        })
        self.assertErr(result)

    def test_leave_get_by_id(self):
        """GET /ess/api/leave/requests/<id> → full leave record."""
        leave = self._create_leave('2026-06-11', '2026-06-11')
        result = self._call('GET', f'/ess/api/leave/requests/{leave["id"]}')
        data = self.assertOk(result)
        self.assertEqual(data['id'], leave['id'])
        self.assertIn('approval_history', data)
        self._delete_leave(leave['id'])

    def test_leave_get_nonexistent_fails(self):
        """GET /ess/api/leave/requests/999999 → error."""
        result = self._call('GET', '/ess/api/leave/requests/999999')
        self.assertErr(result)

    # ── Workflow ──────────────────────────────────────────────────────────────

    def test_leave_approve_workflow(self):
        """POST /ess/api/leave/approve → moves leave to validate1/validate state."""
        leave = self._create_leave('2026-06-12', '2026-06-12')
        result = self._call('POST', '/ess/api/leave/approve', {'leave_id': leave['id']})
        self.assertOk(result)
        self._delete_leave(leave['id'])

    def test_leave_refuse_workflow(self):
        """POST /ess/api/leave/refuse → moves leave to refuse state."""
        leave = self._create_leave('2026-06-13', '2026-06-13')
        result = self._call('POST', '/ess/api/leave/refuse', {
            'leave_id': leave['id'],
            'reason':   'unit test refusal',
        })
        self.assertOk(result)
        self._delete_leave(leave['id'])

    def test_leave_reset_to_draft(self):
        """POST /ess/api/leave/reset → resets leave to confirm state."""
        leave = self._create_leave('2026-06-14', '2026-06-14')
        result = self._call('POST', '/ess/api/leave/reset', {'leave_id': leave['id']})
        self.assertOk(result)
        self._delete_leave(leave['id'])
