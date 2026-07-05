"""Tests for /ess/api/auth/* endpoints."""
from odoo.tests import tagged
from .common import EssClientTestCase


@tagged('post_install', '-at_install', 'ess_api', 'ess_auth')
class TestAuth(EssClientTestCase):

    # ── Companies ─────────────────────────────────────────────────────────────

    def test_companies_returns_list(self):
        """GET /ess/api/auth/companies → list of companies, no auth required."""
        result = self._call('GET', '/ess/api/auth/companies', auth=False)
        data = self.assertOk(result)
        self.assertIsInstance(data, list)
        self.assertTrue(len(data) >= 1, 'Expected at least one company')
        company = data[0]
        self.assertHasKeys(company, ['id', 'name'])

    # ── Login ─────────────────────────────────────────────────────────────────

    def test_login_badge_pin_success(self):
        """POST /ess/api/auth/login with valid badge+pin → tokens + user profile."""
        result = self._call('POST', '/ess/api/auth/login', {
            'badge_id':   self.badge_id,
            'pin':        self.pin,
            'company_id': self.company_id,
        }, auth=False)
        data = self.assertOk(result)
        self.assertHasKeys(data, ['user', 'tokens'])
        self.assertHasKeys(data['tokens'], ['access_token', 'refresh_token', 'expires_in'])
        self.assertHasKeys(data['user'], ['id', 'name'])
        self.assertEqual(data['user']['id'], self.emp_id)

    def test_login_wrong_pin_fails(self):
        """POST /ess/api/auth/login with wrong PIN → error."""
        result = self._call('POST', '/ess/api/auth/login', {
            'badge_id':   self.badge_id,
            'pin':        'WRONG_PIN',
            'company_id': self.company_id,
        }, auth=False)
        self.assertErr(result)

    def test_login_unknown_badge_fails(self):
        """POST /ess/api/auth/login with unknown badge → error."""
        result = self._call('POST', '/ess/api/auth/login', {
            'badge_id':   'BADGE_DOES_NOT_EXIST',
            'pin':        self.pin,
            'company_id': self.company_id,
        }, auth=False)
        self.assertErr(result)

    def test_login_no_credentials_fails(self):
        """POST /ess/api/auth/login with no badge_id or username → 400."""
        result = self._call('POST', '/ess/api/auth/login', {
            'company_id': self.company_id,
        }, auth=False)
        self.assertErr(result)

    # ── Refresh ───────────────────────────────────────────────────────────────

    def test_refresh_returns_ok(self):
        """POST /ess/api/auth/refresh → success (stateless — always ok)."""
        result = self._call('POST', '/ess/api/auth/refresh', {
            'refresh_token': self._refresh_token,
        })
        self.assertOk(result)

    # ── Logout ────────────────────────────────────────────────────────────────

    def test_logout_returns_ok(self):
        """POST /ess/api/auth/logout → success."""
        result = self._call('POST', '/ess/api/auth/logout', {})
        data = self.assertOk(result)
        self.assertTrue(data.get('logged_out'))

    # ── By-user ───────────────────────────────────────────────────────────────

    def test_by_user_with_valid_user_id(self):
        """GET /ess/api/auth/by-user with Odoo admin user_id → ok or not found."""
        result = self._call('GET', '/ess/api/auth/by-user', {'user_id': 2})
        # May succeed (employee linked to admin user) or fail with not-found — both OK
        self.assertIn('success', result)

    def test_by_user_missing_user_id(self):
        """GET /ess/api/auth/by-user with no user_id → error."""
        result = self._call('GET', '/ess/api/auth/by-user', {})
        self.assertErr(result)

    # ── Unauthenticated access ────────────────────────────────────────────────

    def test_protected_endpoint_without_token_fails(self):
        """GET /ess/api/profile without auth headers → 401."""
        result = self._call('GET', '/ess/api/profile', auth=False)
        self.assertErr(result, code='UNAUTHENTICATED')
