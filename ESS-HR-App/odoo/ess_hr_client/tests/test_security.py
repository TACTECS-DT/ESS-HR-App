"""
Security / access-control tests.

These tests verify that the BOLA fixes and role-gate fixes actually work:
  - A regular employee cannot read/modify another employee's records (BOLA)
  - A regular employee is denied analytics endpoints (require_hr_or_admin)
  - A regular employee is denied /auth/by-user (require_hr_or_admin)
  - Access denials return HTTP 403 / error code ACCESS_DENIED (not 500)

The "victim" employee is created as a fresh hr.employee with no user_id and
no Odoo account, so they have no group membership. The "attacker" is the
standard test employee (admin), who bypasses all checks — so these tests
create a second non-admin employee to act as the attacker.

Setup strategy
--------------
setUpClass creates:
  - cls.victim_emp : hr.employee with no user_id (no Odoo user at all)
  - cls.attacker_emp + cls.attacker_credential : a real Odoo user with NO
    special HR groups (employee group only), giving us a token we can use

Each test method authenticates as the attacker and attempts to access the
victim's data or admin-only endpoints.
"""
from odoo.tests import tagged
from .common import EssClientTestCase

_ATTACKER_BADGE = 'ESS_SEC_ATTACKER_01'
_ATTACKER_PIN   = '8888'


@tagged('post_install', '-at_install', 'ess_api', 'ess_security')
class TestBola(EssClientTestCase):
    """
    Verify that detail endpoints enforce record-level ownership.
    Attacker = authenticated employee with no special groups.
    Victim   = a different employee whose records the attacker must not read.
    """

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        env = cls.env

        # ── Victim employee (no Odoo user — no groups) ────────────────────────
        cls.victim_emp = env['hr.employee'].sudo().create({
            'name':       'SEC Test Victim Employee',
            'company_id': cls.company_id,
        })

        # ── Attacker: a dedicated test user with employee-only access ────────
        attacker_user = env['res.users'].sudo().search(
            [('login', '=', 'ess_sec_attacker@test.local')], limit=1,
        )
        if not attacker_user:
            attacker_user = env['res.users'].sudo().create({
                'name':      'SEC Attacker User',
                'login':     'ess_sec_attacker@test.local',
                'password':  'attacker123',
                'group_ids': [(6, 0, [env.ref('base.group_user').id])],
                'company_id': cls.company_id,
            })

        existing_att_emp = env['hr.employee'].sudo().search(
            [('user_id', '=', attacker_user.id), ('company_id', '=', cls.company_id)],
            limit=1,
        )
        if existing_att_emp:
            cls.attacker_emp = existing_att_emp
        else:
            cls.attacker_emp = env['hr.employee'].sudo().create({
                'name':       'SEC Test Attacker Employee',
                'company_id': cls.company_id,
                'user_id':    attacker_user.id,
            })

        # Create or update the attacker credential (handle leftover from crashes)
        att_cred = env['ess.employee.credential'].sudo().search(
            [('employee_id', '=', cls.attacker_emp.id)], limit=1,
        )
        if att_cred:
            att_cred.write({'badge_id': _ATTACKER_BADGE, 'new_pin': _ATTACKER_PIN})
        else:
            env['ess.employee.credential'].sudo().create({
                'employee_id': cls.attacker_emp.id,
                'badge_id':    _ATTACKER_BADGE,
                'new_pin':     _ATTACKER_PIN,
            })

        cls.attacker_emp_id = cls.attacker_emp.id
        cls.victim_emp_id   = cls.victim_emp.id

    def _attacker_headers(self):
        """Authenticate as the attacker and return their auth headers."""
        result = self._call('POST', '/ess/api/auth/login', {
            'badge_id':   _ATTACKER_BADGE,
            'pin':        _ATTACKER_PIN,
            'company_id': self.company_id,
        }, auth=False, log=False)
        if not result.get('success'):
            self.skipTest('Attacker login failed — skipping BOLA test')
        data   = result['data']
        tokens = data['tokens']
        return {
            'Authorization':          f"Bearer {tokens['access_token']}",
            'X-ESS-Company-ID':       str(self.company_id),
            'X-ESS-Employee-ID':      str(self.attacker_emp_id),
            'X-ESS-Login-Mode':       'badge',
            'X-ESS-Login-Identifier': _ATTACKER_BADGE,
            'X-ESS-Force-Logout-Gen': str(data.get('force_logout_gen', 0)),
        }

    def _as_attacker(self, method, path, body=None):
        """Make a request authenticated as the non-admin attacker."""
        return self._call(method, path, body,
                          auth=False, extra_headers=self._attacker_headers())

    def assertAccessDenied(self, result, msg=None):
        """Assert success=False and error code is ACCESS_DENIED (403)."""
        self.assertFalse(
            result.get('success'),
            msg or f'Expected ACCESS_DENIED but got success. Response: {result}',
        )
        code = result.get('error', {}).get('code', '')
        self.assertEqual(
            code, 'ACCESS_DENIED',
            f'Expected error code ACCESS_DENIED, got {code!r}. Response: {result}',
        )

    # ── /auth/by-user — require_hr_or_admin ───────────────────────────────────

    def test_by_user_denied_for_regular_employee(self):
        """Regular employee calling /auth/by-user → 403 ACCESS_DENIED."""
        result = self._as_attacker('GET', '/ess/api/auth/by-user', {'user_id': 2})
        self.assertAccessDenied(result)

    # ── Leave BOLA ────────────────────────────────────────────────────────────

    def test_leave_get_other_employee_denied(self):
        """Regular employee cannot GET another employee's leave detail → ACCESS_DENIED."""
        # Create a leave owned by the victim (as admin/test-employee)
        leave_result = self._call('POST', '/ess/api/leave/requests', {
            'leave_type_id': self.leave_type_id if hasattr(self, 'leave_type_id') else self._any_leave_type(),
            'date_from':     '2026-07-01',
            'date_to':       '2026-07-01',
            'description':   'BOLA security test leave',
        })
        if not leave_result.get('success'):
            self.skipTest('Could not create leave for BOLA test — skipping')
        leave_id = leave_result['data']['id']

        try:
            result = self._as_attacker('GET', f'/ess/api/leave/requests/{leave_id}')
            self.assertAccessDenied(result)
        finally:
            self.env['hr.leave'].sudo().browse(leave_id).sudo().action_refuse()
            self.env['hr.leave'].sudo().browse(leave_id).unlink()

    def _any_leave_type(self):
        lt = self.env['hr.leave.type'].sudo().search([
            ('active', '=', True), ('employee_requests', '=', 'yes'),
        ], limit=1)
        return lt.id if lt else False

    # ── Loan BOLA ─────────────────────────────────────────────────────────────

    def test_loan_get_other_employee_denied(self):
        """Regular employee cannot GET another employee's loan → ACCESS_DENIED."""
        # Create a loan owned by the test employee (admin)
        loan_result = self._call('POST', '/ess/api/loans', {
            'loan_amount':     500,
            'duration_months': 6,
            'transfer_method': 'bank',
        })
        if not loan_result.get('success'):
            self.skipTest('Loan creation blocked by business rules — skipping BOLA test')
        loan_id = loan_result['data']['id']

        try:
            result = self._as_attacker('GET', f'/ess/api/loans/{loan_id}')
            self.assertAccessDenied(result)
        finally:
            self.env['hr.loan'].sudo().browse(loan_id).unlink()

    # ── Advance Salary BOLA ───────────────────────────────────────────────────

    def test_advance_get_other_employee_denied(self):
        """Regular employee cannot GET another employee's advance salary → ACCESS_DENIED."""
        cap_result = self._call('GET', '/ess/api/advance-salary/info')
        if not cap_result.get('success') or cap_result['data'].get('cap', 0) <= 0:
            self.skipTest('No active contract → skipping advance BOLA test')

        cap = cap_result['data']['cap']
        adv_result = self._call('POST', '/ess/api/advance-salary', {
            'advance_amount': round(cap * 0.3, 2),
        })
        if not adv_result.get('success'):
            self.skipTest('Advance creation failed → skipping BOLA test')
        adv_id = adv_result['data']['id']

        try:
            result = self._as_attacker('GET', f'/ess/api/advance-salary/{adv_id}')
            self.assertAccessDenied(result)
        finally:
            self.env['hr.advance.salary'].sudo().browse(adv_id).unlink()

    # ── Expense BOLA ──────────────────────────────────────────────────────────

    def test_expense_get_other_employee_denied(self):
        """Regular employee cannot GET another employee's expense → ACCESS_DENIED."""
        prod = self.env['product.product'].sudo().search(
            [('can_be_expensed', '=', True)], limit=1
        )
        if not prod:
            self.skipTest('No expensable product → skipping expense BOLA test')

        currency_id = self.env.ref('base.main_company').currency_id.id or 1
        exp_result = self._call('POST', '/ess/api/expenses', {
            'product_id':   prod.id,
            'total_amount': 50.0,
            'currency_id':  currency_id,
            'name':         'BOLA test expense',
        })
        if not exp_result.get('success'):
            self.skipTest('Expense creation failed → skipping BOLA test')
        exp_id = exp_result['data']['id']

        try:
            result = self._as_attacker('GET', f'/ess/api/expenses/{exp_id}')
            self.assertAccessDenied(result)
        finally:
            self.env['hr.expense'].sudo().browse(exp_id).unlink()

    # ── HR Letter BOLA ────────────────────────────────────────────────────────

    def test_hr_letter_get_other_employee_denied(self):
        """Regular employee cannot GET another employee's HR letter → ACCESS_DENIED."""
        letter_result = self._call('POST', '/ess/api/hr-letters', {
            'directed_to': 'To Whom It May Concern',
            'salary_type': 'gross',
        })
        if not letter_result.get('success'):
            self.skipTest('HR letter creation failed → skipping BOLA test')
        letter_id = letter_result['data']['id']

        try:
            result = self._as_attacker('GET', f'/ess/api/hr-letters/{letter_id}')
            self.assertAccessDenied(result)
        finally:
            self.env['hr.letter.request'].sudo().browse(letter_id).unlink()


@tagged('post_install', '-at_install', 'ess_api', 'ess_security')
class TestRoleGates(EssClientTestCase):
    """
    Verify that HR/Admin-only endpoints reject regular employees.
    Uses the same attacker employee from TestBola.
    """

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        env = cls.env

        attacker_user = env['res.users'].sudo().search(
            [('login', '=', 'ess_role_attacker@test.local')], limit=1,
        )
        if not attacker_user:
            attacker_user = env['res.users'].sudo().create({
                'name':      'SEC Role Attacker User',
                'login':     'ess_role_attacker@test.local',
                'password':  'attacker456',
                'group_ids': [(6, 0, [env.ref('base.group_user').id])],
                'company_id': cls.company_id,
            })

        existing = env['hr.employee'].sudo().search(
            [('user_id', '=', attacker_user.id), ('company_id', '=', cls.company_id)],
            limit=1,
        )
        if existing:
            cls.attacker_emp = existing
        else:
            cls.attacker_emp = env['hr.employee'].sudo().create({
                'name':       'SEC Role Attacker Employee',
                'company_id': cls.company_id,
                'user_id':    attacker_user.id,
            })

        badge = 'ESS_SEC_ROLE_01'
        role_cred = env['ess.employee.credential'].sudo().search(
            [('employee_id', '=', cls.attacker_emp.id)], limit=1,
        )
        if role_cred:
            role_cred.write({'badge_id': badge, 'new_pin': '9999'})
        else:
            env['ess.employee.credential'].sudo().create({
                'employee_id': cls.attacker_emp.id,
                'badge_id':    badge,
                'new_pin':     '9999',
            })
        cls._role_badge = badge
        cls._role_pin   = '9999'

    def _attacker_headers(self):
        result = self._call('POST', '/ess/api/auth/login', {
            'badge_id':   self._role_badge,
            'pin':        self._role_pin,
            'company_id': self.company_id,
        }, auth=False, log=False)
        if not result.get('success'):
            self.skipTest('Role attacker login failed — skipping role gate test')
        data   = result['data']
        tokens = data['tokens']
        return {
            'Authorization':          f"Bearer {tokens['access_token']}",
            'X-ESS-Company-ID':       str(self.company_id),
            'X-ESS-Employee-ID':      str(self.attacker_emp.id),
            'X-ESS-Login-Mode':       'badge',
            'X-ESS-Login-Identifier': self._role_badge,
            'X-ESS-Force-Logout-Gen': str(data.get('force_logout_gen', 0)),
        }

    def _as_attacker(self, method, path, body=None):
        return self._call(method, path, body,
                          auth=False, extra_headers=self._attacker_headers())

    def assertAccessDenied(self, result, msg=None):
        self.assertFalse(result.get('success'),
                         msg or f'Expected ACCESS_DENIED. Response: {result}')
        code = result.get('error', {}).get('code', '')
        self.assertEqual(code, 'ACCESS_DENIED',
                         f'Expected ACCESS_DENIED, got {code!r}')

    # ── Analytics — require_hr_or_admin ───────────────────────────────────────

    def test_analytics_summary_denied_for_regular_employee(self):
        """Regular employee cannot access analytics summary → ACCESS_DENIED."""
        result = self._as_attacker('GET', '/ess/api/analytics')
        self.assertAccessDenied(result)

    def test_analytics_module_stats_denied_for_regular_employee(self):
        """Regular employee cannot access module-stats → ACCESS_DENIED."""
        result = self._as_attacker('POST', '/ess/api/analytics/module-stats', {})
        self.assertAccessDenied(result)

    def test_analytics_employee_activity_denied_for_regular_employee(self):
        """Regular employee cannot access employee-activity → ACCESS_DENIED."""
        result = self._as_attacker('POST', '/ess/api/analytics/employee-activity', {})
        self.assertAccessDenied(result)

    def test_analytics_error_summary_denied_for_regular_employee(self):
        """Regular employee cannot access error-summary → ACCESS_DENIED."""
        result = self._as_attacker('POST', '/ess/api/analytics/error-summary', {})
        self.assertAccessDenied(result)

    def test_analytics_daily_totals_denied_for_regular_employee(self):
        """Regular employee cannot access daily-totals → ACCESS_DENIED."""
        result = self._as_attacker('POST', '/ess/api/analytics/daily-totals', {})
        self.assertAccessDenied(result)

    # ── /auth/by-user — require_hr_or_admin ──────────────────────────────────

    def test_by_user_denied_for_regular_employee(self):
        """Regular employee calling /auth/by-user → ACCESS_DENIED."""
        result = self._as_attacker('GET', '/ess/api/auth/by-user', {'user_id': 2})
        self.assertAccessDenied(result)

    # ── Admin IS allowed through ──────────────────────────────────────────────

    def test_analytics_allowed_for_admin(self):
        """Admin employee (test employee) CAN access analytics."""
        result = self._call('GET', '/ess/api/analytics')
        self.assertTrue(result.get('success'),
                        f'Admin should be allowed on analytics. Got: {result}')

    def test_by_user_allowed_for_admin(self):
        """/auth/by-user is accessible to admin."""
        result = self._call('GET', '/ess/api/auth/by-user', {'user_id': 2})
        # success or not-found are both OK — what matters is NOT ACCESS_DENIED
        code = result.get('error', {}).get('code', '')
        self.assertNotEqual(code, 'ACCESS_DENIED',
                            f'Admin should not be denied on by-user. Got: {result}')
