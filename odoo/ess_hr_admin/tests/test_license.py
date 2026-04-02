"""
Tests for ess_hr_admin model logic:
  - ess.license.validate_for_mobile()
  - ess.server sync and deactivation logic
  - Cron + manual sync
"""
from unittest.mock import patch, MagicMock
from odoo.tests import tagged
from .common import EssAdminTestCase


@tagged('post_install', '-at_install', 'ess_admin', 'ess_admin_license')
class TestLicenseModel(EssAdminTestCase):
    """Unit tests for ess.license model methods (no HTTP needed)."""

    # ── validate_for_mobile() ─────────────────────────────────────────────────

    def test_validate_for_mobile_valid(self):
        """`validate_for_mobile` returns status=valid for active server."""
        result = self.license.validate_for_mobile(self.server_url)
        self.assertEqual(result['status'], 'valid')
        self.assertIsInstance(result['allowed_modules'], list)
        self.assertIsInstance(result['auto_logout_duration'], int)

    def test_validate_for_mobile_url_stripped(self):
        """`validate_for_mobile` tolerates trailing slash."""
        result = self.license.validate_for_mobile(self.server_url + '/')
        self.assertEqual(result['status'], 'valid')

    def test_validate_for_mobile_server_not_found(self):
        """`validate_for_mobile` raises for unknown URL."""
        with self.assertRaises(Exception):
            self.env['ess.license'].validate_for_mobile('http://no-such-server.xyz')

    def test_validate_for_mobile_inactive_license(self):
        """Inactive license → raises error."""
        from odoo.exceptions import UserError
        self.license.sudo().write({'active': False})
        try:
            with self.assertRaises(Exception):
                self.license.validate_for_mobile(self.server_url)
        finally:
            self.license.sudo().write({'active': True})

    def test_validate_for_mobile_expired_license(self):
        """Expired license → raises error."""
        from odoo.exceptions import UserError
        self.license.sudo().write({'expiry_date': '2020-01-01'})
        try:
            with self.assertRaises(Exception):
                self.license.validate_for_mobile(self.server_url)
        finally:
            self.license.sudo().write({'expiry_date': False})

    def test_validate_for_mobile_employee_limit(self):
        """Employee count above limit → raises error."""
        from odoo.exceptions import UserError
        limit = self.license.max_employees + self.license.employee_overage_allowed
        self.server.sudo().write({'employee_count': limit + 1})
        try:
            with self.assertRaises(Exception):
                self.license.validate_for_mobile(self.server_url)
        finally:
            self.server.sudo().write({'employee_count': 10})


@tagged('post_install', '-at_install', 'ess_admin', 'ess_admin_server')
class TestServerModel(EssAdminTestCase):
    """Tests for ess.server sync and deactivation logic."""

    # ── Stats sync ────────────────────────────────────────────────────────────

    def test_sync_stats_on_success(self):
        """_sync_stats updates employee_count and active_user_count on 200 response."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'success': True,
            'data': {
                'employee_count':   25,
                'active_user_count': 8,
                'employees':        [],
                'active_users':     [],
            },
        }

        with patch('requests.get', return_value=mock_response):
            self.server.sudo()._sync_stats()

        self.assertEqual(self.server.employee_count, 25)
        self.assertEqual(self.server.active_user_count, 8)
        self.assertEqual(self.server.last_sync_status, 'success')

    def test_sync_stats_on_connection_error(self):
        """_sync_stats marks server unreachable on connection error."""
        import requests as req
        with patch('requests.get', side_effect=req.exceptions.ConnectionError('refused')):
            self.server.sudo()._sync_stats()

        self.assertEqual(self.server.server_status, 'deactivated')
        # License should be deactivated
        self.assertFalse(self.license.active)
        # Restore for other tests
        self.license.sudo().write({'active': True})
        self.server.sudo().write({'server_status': 'active'})

    def test_sync_stats_on_timeout(self):
        """_sync_stats marks server unreachable on timeout."""
        import requests as req
        with patch('requests.get', side_effect=req.exceptions.Timeout('timed out')):
            self.server.sudo()._sync_stats()

        self.assertEqual(self.server.server_status, 'deactivated')
        self.assertFalse(self.license.active)
        # Restore
        self.license.sudo().write({'active': True})
        self.server.sudo().write({'server_status': 'active'})

    def test_sync_stats_deactivates_on_employee_limit_exceeded(self):
        """_sync_stats deactivates license when returned count exceeds limit."""
        limit = self.license.max_employees + self.license.employee_overage_allowed
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'success': True,
            'data': {
                'employee_count':   limit + 5,
                'active_user_count': 2,
                'employees':        [],
                'active_users':     [],
            },
        }

        with patch('requests.get', return_value=mock_response):
            self.server.sudo()._sync_stats()

        self.assertFalse(self.license.active)
        deact_reason = self.license.deactivation_reason
        self.assertIn('employee', deact_reason.lower())
        # Restore
        self.license.sudo().write({
            'active': True,
            'deactivation_reason': False,
            'deactivation_date': False,
        })
        self.server.sudo().write({'employee_count': 10})

    # ── Manual sync button ────────────────────────────────────────────────────

    def test_action_sync_stats_button(self):
        """action_sync_stats() (manual sync button) calls _sync_stats."""
        with patch.object(type(self.server), '_sync_stats') as mock_sync:
            self.server.sudo().action_sync_stats()
            mock_sync.assert_called_once()

    # ── Cron ─────────────────────────────────────────────────────────────────

    def test_cron_sync_all_stats_calls_each_server(self):
        """cron_sync_all_stats() iterates all active servers and syncs each."""
        with patch.object(type(self.server), '_sync_stats') as mock_sync:
            self.env['ess.server'].sudo().cron_sync_all_stats()
            # Our test server is active so it should be called at least once
            self.assertTrue(mock_sync.call_count >= 1)


@tagged('post_install', '-at_install', 'ess_admin', 'ess_admin_models')
class TestLicenseFields(EssAdminTestCase):
    """Tests for ess.license and ess.server field values and constraints."""

    def test_license_has_required_fields(self):
        """ess.license record has all expected fields."""
        lic = self.license
        self.assertTrue(lic.name)
        self.assertTrue(lic.license_key)
        self.assertTrue(lic.active)
        self.assertGreater(lic.max_employees, 0)
        self.assertGreaterEqual(lic.employee_overage_allowed, 0)
        self.assertTrue(lic.module_ids)

    def test_server_has_required_fields(self):
        """ess.server record has all expected fields."""
        srv = self.server
        self.assertTrue(srv.name)
        self.assertTrue(srv.url)
        self.assertEqual(srv.license_id.id, self.license.id)
        self.assertGreater(srv.auto_logout_duration, 0)

    def test_module_codes_are_unique(self):
        """ess.module codes must be unique across all modules."""
        modules = self.env['ess.module'].sudo().search([])
        codes = [m.code for m in modules]
        self.assertEqual(len(codes), len(set(codes)),
                         f'Duplicate module codes found: {codes}')

    def test_server_url_linked_to_license(self):
        """Server is linked to its license via license_id."""
        self.assertEqual(self.server.license_id, self.license)
        self.assertIn(self.server, self.license.server_ids)

    def test_deactivation_sets_reason_and_date(self):
        """_deactivate_license() sets deactivation_reason and deactivation_date."""
        self.license.sudo().write({'active': True})
        self.server.sudo()._deactivate_license('Test deactivation reason')

        self.assertFalse(self.license.active)
        self.assertEqual(self.license.deactivation_reason, 'Test deactivation reason')
        self.assertIsNotNone(self.license.deactivation_date)

        # Restore
        self.license.sudo().write({
            'active': True,
            'deactivation_reason': False,
            'deactivation_date':   False,
        })
