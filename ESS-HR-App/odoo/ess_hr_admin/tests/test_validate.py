"""
Tests for POST /ess/admin/api/validate endpoint.

This is the Step-1 login endpoint called by the mobile app.
It validates a client server URL and returns:
  { status, allowed_modules, auto_logout_duration }
"""
from odoo.tests import tagged
from .common import EssAdminTestCase


@tagged('post_install', '-at_install', 'ess_admin', 'ess_admin_validate')
class TestValidateEndpoint(EssAdminTestCase):

    # ── Success cases ─────────────────────────────────────────────────────────

    def test_validate_valid_server_returns_ok(self):
        """POST /ess/admin/api/validate with registered server URL → success."""
        result = self._call('POST', '/ess/admin/api/validate', {
            'server_url': self.server_url,
        })
        data = self.assertOk(result)
        self.assertHasKeys(data, ['status', 'allowed_modules', 'auto_logout_duration'])
        self.assertEqual(data['status'], 'valid')

    def test_validate_returns_allowed_modules_list(self):
        """Validate response contains allowed_modules as list of code dicts."""
        result = self._call('POST', '/ess/admin/api/validate', {
            'server_url': self.server_url,
        })
        data = self.assertOk(result)
        modules = data['allowed_modules']
        self.assertIsInstance(modules, list)
        self.assertTrue(len(modules) >= 1, 'Expected at least one allowed module')
        m = modules[0]
        self.assertHasKeys(m, ['code', 'name'])

    def test_validate_returns_auto_logout_duration(self):
        """Validate response contains auto_logout_duration in hours."""
        result = self._call('POST', '/ess/admin/api/validate', {
            'server_url': self.server_url,
        })
        data = self.assertOk(result)
        duration = data['auto_logout_duration']
        self.assertIsInstance(duration, int)
        self.assertGreater(duration, 0)
        self.assertEqual(duration, 72)  # matches our fixture server setting

    def test_validate_url_trailing_slash_normalized(self):
        """Validate endpoint normalises trailing slashes in server URL."""
        result = self._call('POST', '/ess/admin/api/validate', {
            'server_url': self.server_url + '/',  # trailing slash
        })
        self.assertOk(result)

    def test_validate_url_case_insensitive(self):
        """Validate endpoint does case-insensitive URL matching."""
        result = self._call('POST', '/ess/admin/api/validate', {
            'server_url': self.server_url.upper(),
        })
        self.assertOk(result)

    def test_validate_module_codes_are_strings(self):
        """allowed_modules codes must be non-empty strings (used by mobile app)."""
        result = self._call('POST', '/ess/admin/api/validate', {
            'server_url': self.server_url,
        })
        data = self.assertOk(result)
        for m in data['allowed_modules']:
            self.assertIsInstance(m['code'], str)
            self.assertTrue(m['code'].strip(), 'Module code must not be empty')

    # ── Server not found ──────────────────────────────────────────────────────

    def test_validate_unknown_server_returns_not_found(self):
        """POST /ess/admin/api/validate with unregistered URL → SERVER_NOT_FOUND."""
        result = self._call('POST', '/ess/admin/api/validate', {
            'server_url': 'http://unknown-server-xyz.local',
        })
        self.assertErr(result, code='SERVER_NOT_FOUND')

    def test_validate_empty_server_url_fails(self):
        """POST /ess/admin/api/validate with empty server_url → error."""
        result = self._call('POST', '/ess/admin/api/validate', {'server_url': ''})
        self.assertErr(result)

    def test_validate_missing_server_url_fails(self):
        """POST /ess/admin/api/validate with no server_url key → error."""
        result = self._call('POST', '/ess/admin/api/validate', {})
        self.assertErr(result)

    # ── Inactive license ──────────────────────────────────────────────────────

    def test_validate_inactive_license_returns_error(self):
        """Deactivated license → LICENSE_INACTIVE error."""
        self.license.sudo().write({'active': False})
        try:
            result = self._call('POST', '/ess/admin/api/validate', {
                'server_url': self.server_url,
            })
            self.assertErr(result, code='LICENSE_INACTIVE')
        finally:
            self.license.sudo().write({'active': True})  # restore

    # ── Expired license ───────────────────────────────────────────────────────

    def test_validate_expired_license_returns_error(self):
        """Expired license → LICENSE_EXPIRED error."""
        self.license.sudo().write({'expiry_date': '2020-01-01'})
        try:
            result = self._call('POST', '/ess/admin/api/validate', {
                'server_url': self.server_url,
            })
            self.assertErr(result, code='LICENSE_EXPIRED')
        finally:
            self.license.sudo().write({'expiry_date': False})  # restore

    # ── Employee limit exceeded ───────────────────────────────────────────────

    def test_validate_employee_limit_exceeded_returns_error(self):
        """Server employee count above max+overage → EMPLOYEE_LIMIT error."""
        # Set server's synced employee count above the limit
        limit = self.license.max_employees + self.license.employee_overage_allowed
        self.server.sudo().write({'employee_count': limit + 1})
        try:
            result = self._call('POST', '/ess/admin/api/validate', {
                'server_url': self.server_url,
            })
            self.assertErr(result, code='EMPLOYEE_LIMIT')
        finally:
            self.server.sudo().write({'employee_count': 10})  # restore

    # ── Empty module list means all allowed ───────────────────────────────────

    def test_validate_no_modules_configured_returns_all(self):
        """License with no module_ids → returns all active modules."""
        self.license.sudo().write({'module_ids': [(5, 0, 0)]})  # clear modules
        try:
            result = self._call('POST', '/ess/admin/api/validate', {
                'server_url': self.server_url,
            })
            data = self.assertOk(result)
            # When module_ids is empty, all active modules are returned
            all_active = self.env['ess.module'].sudo().search_count(
                [('active', '=', True)]
            )
            self.assertEqual(len(data['allowed_modules']), all_active)
        finally:
            # Restore modules
            m_att = self.env['ess.module'].sudo().search(
                [('code', '=', 'attendance')], limit=1
            )
            m_lve = self.env['ess.module'].sudo().search(
                [('code', '=', 'leave')], limit=1
            )
            self.license.sudo().write({
                'module_ids': [(6, 0, [m_att.id, m_lve.id])]
            })
