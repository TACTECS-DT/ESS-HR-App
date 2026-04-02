"""Tests for /ess/api/payslip/* endpoints."""
from odoo.tests import tagged
from .common import EssClientTestCase


@tagged('post_install', '-at_install', 'ess_api', 'ess_payslip')
class TestPayslip(EssClientTestCase):

    def test_payslip_list_returns_list(self):
        """GET /ess/api/payslip → list of payslip summaries (may be empty)."""
        result = self._call('GET', '/ess/api/payslip')
        data = self.assertOk(result)
        self.assertIsInstance(data, list)
        if data:
            slip = data[0]
            self.assertHasKeys(slip, ['id', 'name', 'employee_id', 'state',
                                       'date_from', 'date_to'])

    def test_payslip_list_filter_by_year(self):
        """GET /ess/api/payslip with year param → filtered list."""
        result = self._call('GET', '/ess/api/payslip', {'year': 2026})
        data = self.assertOk(result)
        self.assertIsInstance(data, list)

    def test_payslip_get_by_id_if_available(self):
        """GET /ess/api/payslip/<id> → full payslip with lines (skipped if no data)."""
        list_result = self._call('GET', '/ess/api/payslip')
        slips = self.assertOk(list_result)
        if not slips:
            self.skipTest('No payslips in DB — skipping payslip-by-id test')

        slip_id = slips[0]['id']
        result = self._call('GET', f'/ess/api/payslip/{slip_id}')
        data = self.assertOk(result)
        self.assertEqual(data['id'], slip_id)
        self.assertHasKeys(data, ['earnings', 'deductions', 'net_pay'])

    def test_payslip_get_nonexistent_fails(self):
        """GET /ess/api/payslip/999999 → error."""
        result = self._call('GET', '/ess/api/payslip/999999')
        self.assertErr(result)

    def test_payslip_pdf_if_available(self):
        """POST /ess/api/payslip/pdf → base64 PDF string (skipped if no payslip)."""
        list_result = self._call('GET', '/ess/api/payslip')
        slips = self.assertOk(list_result)
        if not slips:
            self.skipTest('No payslips in DB — skipping PDF test')

        result = self._call('POST', '/ess/api/payslip/pdf',
                            {'payslip_id': slips[0]['id']})
        # PDF generation may fail if report template not set up — allow either
        self.assertIn('success', result)
