from odoo.tests.common import TransactionCase
from odoo.exceptions import UserError


class TestLoan(TransactionCase):

    def setUp(self):
        super().setUp()
        self.company = self.env.ref('base.main_company')
        self.employee = self.env['hr.employee'].create({
            'name': 'Loan Test Employee',
            'company_id': self.company.id,
        })
        struct_type = self.env['hr.payroll.structure.type'].search([], limit=1)
        if not struct_type:
            struct_type = self.env['hr.payroll.structure.type'].create({
                'name': 'Test Structure Type',
                'wage_type': 'monthly',
            })
        self.contract = self.env['hr.contract'].create({
            'name': 'Loan Test Contract',
            'employee_id': self.employee.id,
            'wage': 10000.0,
            'date_start': '2020-01-01',
            'state': 'open',
            'structure_type_id': struct_type.id,
            'company_id': self.company.id,
        })
        self.loan_config = self.env['hr.loan.config'].create({
            'company_id': self.company.id,
            'min_hiring_months': 1,
            'max_duration_months': 24,
            'min_gap_months': 1,
            'max_amount_percentage': 3.0,
        })
        self.approver = self.env['hr.employee'].create({
            'name': 'Loan Approver',
            'company_id': self.company.id,
        })
        self.loan_model = self.env['hr.loan']

    def test_create_loan_success(self):
        """create_loan creates a loan and returns a dict with submitted state."""
        result = self.loan_model.create_loan(
            self.employee.id, 15000.0, 12, 'bank'
        )
        self.assertIsInstance(result, dict)
        self.assertEqual(result['employee_id'], self.employee.id)
        self.assertEqual(result['state'], 'submitted')

    def test_create_loan_exceeds_max_amount_raises(self):
        """create_loan raises UserError when amount exceeds 3 months salary."""
        with self.assertRaises(UserError):
            self.loan_model.create_loan(self.employee.id, 50000.0, 12, 'bank')

    def test_create_loan_exceeds_max_duration_raises(self):
        """create_loan raises UserError when duration exceeds max_duration_months."""
        with self.assertRaises(UserError):
            self.loan_model.create_loan(self.employee.id, 5000.0, 36, 'bank')

    def test_get_loans_returns_list(self):
        """get_loans returns a list for the employee."""
        self.loan_model.create_loan(self.employee.id, 5000.0, 6, 'bank')
        result = self.loan_model.get_loans(self.employee.id)
        self.assertIsInstance(result, list)
        self.assertGreater(len(result), 0)

    def test_get_loan_detail_includes_installments(self):
        """get_loan_detail returns a dict with installments list."""
        loan = self.loan_model.create_loan(self.employee.id, 6000.0, 6, 'bank')
        detail = self.loan_model.get_loan_detail(loan['id'])
        self.assertIn('installments', detail)
        self.assertIsInstance(detail['installments'], list)
        self.assertEqual(len(detail['installments']), 6)

    def test_approve_loan(self):
        """approve_loan transitions the loan to approved state."""
        loan = self.loan_model.create_loan(self.employee.id, 6000.0, 6, 'cash')
        result = self.loan_model.approve_loan(loan['id'], self.approver.id)
        self.assertTrue(result)
        approved_loan = self.loan_model.browse(loan['id'])
        self.assertEqual(approved_loan.state, 'approved')
        self.assertEqual(approved_loan.approved_by.id, self.approver.id)

    def test_refuse_loan(self):
        """refuse_loan transitions the loan to refused state with reason."""
        loan = self.loan_model.create_loan(self.employee.id, 6000.0, 6, 'cheque')
        result = self.loan_model.refuse_loan(loan['id'], self.approver.id, 'Budget exceeded')
        self.assertTrue(result)
        refused_loan = self.loan_model.browse(loan['id'])
        self.assertEqual(refused_loan.state, 'refused')
        self.assertEqual(refused_loan.reason_refusal, 'Budget exceeded')

    def test_get_loan_rules_returns_config(self):
        """get_loan_rules returns the configured rules dict for the company."""
        rules = self.loan_model.get_loan_rules(self.company.id)
        self.assertIn('min_hiring_months', rules)
        self.assertIn('max_duration_months', rules)
        self.assertIn('min_gap_months', rules)
        self.assertIn('max_amount_percentage', rules)

    def test_installment_amounts_sum_to_loan(self):
        """Generated installments sum to the total loan amount."""
        loan = self.loan_model.create_loan(self.employee.id, 6000.0, 6, 'bank')
        detail = self.loan_model.get_loan_detail(loan['id'])
        total = sum(i['amount'] for i in detail['installments'])
        self.assertAlmostEqual(total, 6000.0, places=0)
