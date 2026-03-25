from odoo.tests.common import TransactionCase
from odoo.exceptions import UserError


class TestHrServices(TransactionCase):

    def setUp(self):
        super().setUp()
        self.company = self.env.ref('base.main_company')
        self.employee = self.env['hr.employee'].create({
            'name': 'Services Test Employee',
            'company_id': self.company.id,
        })
        self.approver = self.env['hr.employee'].create({
            'name': 'Services Approver',
            'company_id': self.company.id,
        })
        self.service_type = self.env['hr.business.service.type'].create({
            'name': 'Test IT Support',
            'company_id': self.company.id,
            'active': True,
        })

    # ── Letter Tests ──────────────────────────────────────────────────────────

    def test_create_letter(self):
        """create_letter returns a dict with the correct employee and salary_type."""
        result = self.env['hr.letter.request'].create_letter(
            self.employee.id, 'Bank XYZ', 'net'
        )
        self.assertIsInstance(result, dict)
        self.assertEqual(result['employee_id'], self.employee.id)
        self.assertEqual(result['salary_type'], 'net')
        self.assertEqual(result['state'], 'submitted')

    def test_get_letter_list(self):
        """get_letter_list returns at least the created letter."""
        self.env['hr.letter.request'].create_letter(self.employee.id, 'To Whom', 'gross')
        result = self.env['hr.letter.request'].get_letter_list(self.employee.id)
        self.assertGreater(len(result), 0)

    def test_approve_letter(self):
        """approve_letter sets state to approved."""
        letter = self.env['hr.letter.request'].create_letter(self.employee.id, 'Embassy', 'gross')
        self.env['hr.letter.request'].approve_letter(letter['id'], self.approver.id)
        rec = self.env['hr.letter.request'].browse(letter['id'])
        self.assertEqual(rec.state, 'approved')

    def test_refuse_letter(self):
        """refuse_letter sets state to refused with a reason."""
        letter = self.env['hr.letter.request'].create_letter(self.employee.id, 'Bank', 'net')
        self.env['hr.letter.request'].refuse_letter(letter['id'], self.approver.id, 'Incomplete')
        rec = self.env['hr.letter.request'].browse(letter['id'])
        self.assertEqual(rec.state, 'refused')
        self.assertEqual(rec.reason_refusal, 'Incomplete')

    def test_reset_letter(self):
        """reset_letter returns a refused letter to draft."""
        letter = self.env['hr.letter.request'].create_letter(self.employee.id, 'Bank', 'net')
        self.env['hr.letter.request'].refuse_letter(letter['id'], self.approver.id, 'Reason')
        self.env['hr.letter.request'].reset_letter(letter['id'])
        rec = self.env['hr.letter.request'].browse(letter['id'])
        self.assertEqual(rec.state, 'draft')

    def test_delete_letter(self):
        """delete_letter removes a draft letter and returns True."""
        letter_model = self.env['hr.letter.request']
        letter = letter_model.create({
            'employee_id': self.employee.id,
            'directed_to': 'Test',
            'salary_type': 'gross',
            'state': 'draft',
        })
        result = letter_model.delete_letter(letter.id)
        self.assertTrue(result)
        self.assertFalse(letter_model.browse(letter.id).exists())

    # ── Document Tests ────────────────────────────────────────────────────────

    def test_create_document(self):
        """create_document returns a dict in submitted state."""
        result = self.env['hr.document.request'].create_document(
            self.employee.id, 'Passport', '2026-06-01'
        )
        self.assertIsInstance(result, dict)
        self.assertEqual(result['document_type'], 'Passport')
        self.assertEqual(result['state'], 'submitted')

    def test_approve_document(self):
        """approve_document sets state to approved."""
        doc = self.env['hr.document.request'].create_document(self.employee.id, 'ID Card')
        self.env['hr.document.request'].approve_document(doc['id'], self.approver.id)
        rec = self.env['hr.document.request'].browse(doc['id'])
        self.assertEqual(rec.state, 'approved')

    def test_refuse_document(self):
        """refuse_document sets state to refused."""
        doc = self.env['hr.document.request'].create_document(self.employee.id, 'Visa')
        self.env['hr.document.request'].refuse_document(doc['id'], self.approver.id, 'Not due yet')
        rec = self.env['hr.document.request'].browse(doc['id'])
        self.assertEqual(rec.state, 'refused')

    def test_reset_document(self):
        """reset_document returns a refused document to draft."""
        doc = self.env['hr.document.request'].create_document(self.employee.id, 'Visa')
        self.env['hr.document.request'].refuse_document(doc['id'], self.approver.id, 'Reason')
        self.env['hr.document.request'].reset_document(doc['id'])
        rec = self.env['hr.document.request'].browse(doc['id'])
        self.assertEqual(rec.state, 'draft')

    # ── Certificate Tests ─────────────────────────────────────────────────────

    def test_create_certificate(self):
        """create_certificate returns a dict in submitted state."""
        result = self.env['hr.experience.certificate'].create_certificate(
            self.employee.id, 'Whom It May Concern'
        )
        self.assertIsInstance(result, dict)
        self.assertEqual(result['directed_to'], 'Whom It May Concern')
        self.assertEqual(result['state'], 'submitted')

    def test_approve_certificate(self):
        """approve_certificate sets state to approved."""
        cert = self.env['hr.experience.certificate'].create_certificate(self.employee.id, 'Embassy')
        self.env['hr.experience.certificate'].approve_certificate(cert['id'], self.approver.id)
        rec = self.env['hr.experience.certificate'].browse(cert['id'])
        self.assertEqual(rec.state, 'approved')

    def test_refuse_certificate(self):
        """refuse_certificate sets state to refused."""
        cert = self.env['hr.experience.certificate'].create_certificate(self.employee.id, 'Bank')
        self.env['hr.experience.certificate'].refuse_certificate(cert['id'], self.approver.id, 'Early')
        rec = self.env['hr.experience.certificate'].browse(cert['id'])
        self.assertEqual(rec.state, 'refused')

    def test_reset_certificate(self):
        """reset_certificate returns a refused cert to draft."""
        cert = self.env['hr.experience.certificate'].create_certificate(self.employee.id, 'Bank')
        self.env['hr.experience.certificate'].refuse_certificate(cert['id'], self.approver.id, 'R')
        self.env['hr.experience.certificate'].reset_certificate(cert['id'])
        rec = self.env['hr.experience.certificate'].browse(cert['id'])
        self.assertEqual(rec.state, 'draft')

    # ── Business Service Tests ────────────────────────────────────────────────

    def test_get_business_service_types(self):
        """get_business_service_types returns a list including the test service type."""
        result = self.env['hr.business.service.request'].get_business_service_types(self.company.id)
        self.assertIsInstance(result, list)
        ids = [t['id'] for t in result]
        self.assertIn(self.service_type.id, ids)

    def test_create_business_service(self):
        """create_business_service returns a dict in submitted state."""
        result = self.env['hr.business.service.request'].create_business_service(
            self.employee.id, self.service_type.id, 'Laptop broken', '2026-04-01'
        )
        self.assertIsInstance(result, dict)
        self.assertEqual(result['service_type_id'], self.service_type.id)
        self.assertEqual(result['state'], 'submitted')

    def test_approve_business_service(self):
        """approve_business_service sets state to approved."""
        req = self.env['hr.business.service.request'].create_business_service(
            self.employee.id, self.service_type.id, 'Internet issue'
        )
        self.env['hr.business.service.request'].approve_business_service(req['id'], self.approver.id)
        rec = self.env['hr.business.service.request'].browse(req['id'])
        self.assertEqual(rec.state, 'approved')

    def test_refuse_business_service(self):
        """refuse_business_service sets state to refused."""
        req = self.env['hr.business.service.request'].create_business_service(
            self.employee.id, self.service_type.id, 'Monitor issue'
        )
        self.env['hr.business.service.request'].refuse_business_service(
            req['id'], self.approver.id, 'Out of budget'
        )
        rec = self.env['hr.business.service.request'].browse(req['id'])
        self.assertEqual(rec.state, 'refused')

    def test_reset_business_service(self):
        """reset_business_service returns a refused request to draft."""
        req = self.env['hr.business.service.request'].create_business_service(
            self.employee.id, self.service_type.id, 'Printer issue'
        )
        self.env['hr.business.service.request'].refuse_business_service(
            req['id'], self.approver.id, 'Reason'
        )
        self.env['hr.business.service.request'].reset_business_service(req['id'])
        rec = self.env['hr.business.service.request'].browse(req['id'])
        self.assertEqual(rec.state, 'draft')
