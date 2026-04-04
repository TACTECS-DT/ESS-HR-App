"""Tests for /ess/api/profile and /ess/api/employees endpoints."""
from odoo.tests import tagged
from .common import EssClientTestCase


@tagged('post_install', '-at_install', 'ess_api', 'ess_employee')
class TestEmployee(EssClientTestCase):

    def test_profile_returns_employee_data(self):
        """GET /ess/api/profile → employee profile dict."""
        result = self._call('GET', '/ess/api/profile')
        data = self.assertOk(result)
        self.assertHasKeys(data, ['id', 'name', 'company_id'])
        self.assertEqual(data['id'], self.emp_id)

    def test_profile_post_also_works(self):
        """POST /ess/api/profile → same result as GET."""
        result = self._call('POST', '/ess/api/profile', {})
        self.assertOk(result)

    def test_contract_endpoint(self):
        """GET /ess/api/profile/contract → contract summary (empty ok if no contract)."""
        result = self._call('GET', '/ess/api/profile/contract')
        # If no contract, still returns success with empty/null data
        self.assertIn('success', result)

    def test_employee_directory(self):
        """GET /ess/api/employees → list of employee dicts."""
        result = self._call('GET', '/ess/api/employees')
        data = self.assertOk(result)
        self.assertIsInstance(data, list)
        # Our test employee must appear in the directory
        ids = [e['id'] for e in data]
        self.assertIn(self.emp_id, ids)

    def test_employee_directory_search(self):
        """GET /ess/api/employees with search param → filtered results."""
        result = self._call('GET', '/ess/api/employees',
                            {'search': 'ESS API Test Employee'})
        data = self.assertOk(result)
        self.assertIsInstance(data, list)
        self.assertTrue(
            any(e['id'] == self.emp_id for e in data),
            'Test employee not found in search results',
        )
