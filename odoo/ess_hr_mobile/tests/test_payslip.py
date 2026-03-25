from odoo.tests.common import TransactionCase
from odoo.exceptions import UserError


class TestPayslip(TransactionCase):

    def setUp(self):
        super().setUp()
        self.company = self.env.ref('base.main_company')
        self.employee = self.env['hr.employee'].create({
            'name': 'Payslip Test Employee',
            'company_id': self.company.id,
        })
        struct_type = self.env['hr.payroll.structure.type'].search([], limit=1)
        if not struct_type:
            struct_type = self.env['hr.payroll.structure.type'].create({
                'name': 'Test Structure Type',
                'wage_type': 'monthly',
            })
        self.contract = self.env['hr.contract'].create({
            'name': 'Test Contract',
            'employee_id': self.employee.id,
            'wage': 5000.0,
            'date_start': '2025-01-01',
            'state': 'open',
            'structure_type_id': struct_type.id,
            'company_id': self.company.id,
        })
        struct = self.env['hr.payroll.structure'].search([
            ('type_id', '=', struct_type.id)
        ], limit=1)
        self.payslip = self.env['hr.payslip'].create({
            'employee_id': self.employee.id,
            'date_from': '2026-01-01',
            'date_to': '2026-01-31',
            'contract_id': self.contract.id,
            'struct_id': struct.id if struct else False,
            'state': 'done',
            'name': 'Payslip January 2026',
            'company_id': self.company.id,
        })
        self.payslip_model = self.env['hr.payslip']

    def test_get_payslips_returns_list(self):
        """get_payslips returns a list for a valid employee."""
        result = self.payslip_model.get_payslips(self.employee.id)
        self.assertIsInstance(result, list)

    def test_get_payslips_with_year_filter(self):
        """get_payslips with year=2026 includes the test payslip."""
        result = self.payslip_model.get_payslips(self.employee.id, year=2026)
        ids = [p['id'] for p in result]
        self.assertIn(self.payslip.id, ids)

    def test_get_payslips_with_month_filter(self):
        """get_payslips with year=2026, month=1 returns the January payslip."""
        result = self.payslip_model.get_payslips(self.employee.id, year=2026, month=1)
        ids = [p['id'] for p in result]
        self.assertIn(self.payslip.id, ids)

    def test_get_payslips_invalid_employee_raises(self):
        """get_payslips raises UserError for a non-existent employee."""
        with self.assertRaises(UserError):
            self.payslip_model.get_payslips(999999)

    def test_get_payslip_detail_returns_dict(self):
        """get_payslip_detail returns a dict with earnings, deductions, and net_pay."""
        result = self.payslip_model.get_payslip_detail(self.payslip.id)
        self.assertIsInstance(result, dict)
        self.assertIn('earnings', result)
        self.assertIn('deductions', result)
        self.assertIn('net_pay', result)

    def test_get_payslip_detail_invalid_id_raises(self):
        """get_payslip_detail raises UserError for a non-existent payslip ID."""
        with self.assertRaises(UserError):
            self.payslip_model.get_payslip_detail(999999)

    def test_format_payslip_summary_keys(self):
        """_format_payslip_summary returns all expected top-level keys."""
        summary = self.payslip_model._format_payslip_summary(self.payslip)
        for key in ('id', 'name', 'employee_id', 'employee_name', 'date_from', 'date_to', 'state'):
            self.assertIn(key, summary)

    def test_format_payslip_lines_structure(self):
        """_format_payslip_lines returns a dict with earnings, deductions, net_pay keys."""
        lines = self.payslip_model._format_payslip_lines(self.payslip)
        self.assertIn('earnings', lines)
        self.assertIn('deductions', lines)
        self.assertIn('net_pay', lines)
        self.assertIsInstance(lines['earnings'], list)
        self.assertIsInstance(lines['deductions'], list)
