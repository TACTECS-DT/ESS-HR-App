from odoo.tests.common import TransactionCase
from odoo.exceptions import UserError


class TestAdvanceSalary(TransactionCase):

    def setUp(self):
        super().setUp()
        self.company = self.env.ref('base.main_company')
        self.employee = self.env['hr.employee'].create({
            'name': 'Advance Test Employee',
            'company_id': self.company.id,
        })
        struct_type = self.env['hr.payroll.structure.type'].search([], limit=1)
        if not struct_type:
            struct_type = self.env['hr.payroll.structure.type'].create({
                'name': 'Test Structure Type',
                'wage_type': 'monthly',
            })
        self.contract = self.env['hr.contract'].create({
            'name': 'Advance Test Contract',
            'employee_id': self.employee.id,
            'wage': 8000.0,
            'date_start': '2024-01-01',
            'state': 'open',
            'structure_type_id': struct_type.id,
            'company_id': self.company.id,
        })
        self.manager = self.env['hr.employee'].create({
            'name': 'Advance Manager',
            'company_id': self.company.id,
        })
        self.advance_model = self.env['hr.advance.salary']

    def test_get_advance_salary_cap(self):
        """get_advance_salary_cap returns 50% of basic wage."""
        result = self.advance_model.get_advance_salary_cap(self.employee.id)
        self.assertIn('cap', result)
        self.assertIn('basic_wage', result)
        self.assertAlmostEqual(result['cap'], 4000.0, places=2)
        self.assertAlmostEqual(result['basic_wage'], 8000.0, places=2)

    def test_get_advance_salary_cap_invalid_employee_raises(self):
        """get_advance_salary_cap raises UserError for a non-existent employee."""
        with self.assertRaises(UserError):
            self.advance_model.get_advance_salary_cap(999999)

    def test_create_advance_salary_within_cap(self):
        """create_advance_salary succeeds when amount is within the 50% cap."""
        result = self.advance_model.create_advance_salary(self.employee.id, 3000.0)
        self.assertIsInstance(result, dict)
        self.assertEqual(result['employee_id'], self.employee.id)
        self.assertEqual(result['amount'], 3000.0)
        self.assertEqual(result['state'], 'submitted')

    def test_create_advance_salary_exceeds_cap_raises(self):
        """create_advance_salary raises UserError when amount exceeds 50% basic wage."""
        with self.assertRaises(UserError):
            self.advance_model.create_advance_salary(self.employee.id, 5000.0)

    def test_create_advance_salary_no_contract_raises(self):
        """create_advance_salary raises UserError when the employee has no active contract."""
        emp_no_contract = self.env['hr.employee'].create({
            'name': 'No Contract Employee',
            'company_id': self.company.id,
        })
        with self.assertRaises(UserError):
            self.advance_model.create_advance_salary(emp_no_contract.id, 100.0)

    def test_get_advance_salaries_returns_list(self):
        """get_advance_salaries returns a list after creating a request."""
        self.advance_model.create_advance_salary(self.employee.id, 2000.0)
        result = self.advance_model.get_advance_salaries(self.employee.id)
        self.assertIsInstance(result, list)
        self.assertGreater(len(result), 0)

    def test_approve_advance_salary(self):
        """approve_advance_salary transitions state to approved."""
        advance = self.advance_model.create_advance_salary(self.employee.id, 2000.0)
        result = self.advance_model.approve_advance_salary(advance['id'], self.manager.id)
        self.assertTrue(result)
        rec = self.advance_model.browse(advance['id'])
        self.assertEqual(rec.state, 'approved')
        self.assertEqual(rec.approved_by.id, self.manager.id)

    def test_refuse_advance_salary(self):
        """refuse_advance_salary transitions state to refused with reason."""
        advance = self.advance_model.create_advance_salary(self.employee.id, 2000.0)
        result = self.advance_model.refuse_advance_salary(
            advance['id'], self.manager.id, 'Not eligible'
        )
        self.assertTrue(result)
        rec = self.advance_model.browse(advance['id'])
        self.assertEqual(rec.state, 'refused')
        self.assertEqual(rec.reason_refusal, 'Not eligible')

    def test_reset_advance_salary(self):
        """reset_advance_salary resets a refused advance back to draft."""
        advance = self.advance_model.create_advance_salary(self.employee.id, 2000.0)
        self.advance_model.refuse_advance_salary(advance['id'], self.manager.id, 'Reason')
        result = self.advance_model.reset_advance_salary(advance['id'])
        self.assertTrue(result)
        rec = self.advance_model.browse(advance['id'])
        self.assertEqual(rec.state, 'draft')

    def test_reset_approved_advance_raises(self):
        """reset_advance_salary raises UserError when trying to reset an approved request."""
        advance = self.advance_model.create_advance_salary(self.employee.id, 2000.0)
        self.advance_model.approve_advance_salary(advance['id'], self.manager.id)
        with self.assertRaises(UserError):
            self.advance_model.reset_advance_salary(advance['id'])
