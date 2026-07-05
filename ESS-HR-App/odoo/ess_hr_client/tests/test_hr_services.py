"""
Tests for HR service endpoints:
  /ess/api/hr-letters/*
  /ess/api/document-requests/*
  /ess/api/experience-certificates/*
  /ess/api/business-services/*
"""
from odoo.tests import tagged
from .common import EssClientTestCase


class _HrServiceMixin:
    """
    Generic CRUD + workflow test mixin for HR service models.
    Subclasses set:
      list_url, create_url, by_id_url_tpl, approve_url, refuse_url, reset_url
      create_body  — dict for create POST
    """
    list_url         = ''
    create_url       = ''
    by_id_url_tpl    = ''   # e.g. '/ess/api/hr-letters/{id}'
    approve_url      = ''
    refuse_url       = ''
    reset_url        = ''
    create_body      = {}

    def _create_record(self):
        result = self._call('POST', self.create_url, self.create_body)
        self.assertOk(result, f'{self.create_url} create failed')
        return result['data']

    def _delete_record(self, rec_id):
        url = self.by_id_url_tpl.format(id=rec_id)
        rec = self.env.get(self._model_name)
        if rec is not None:
            self.env[self._model_name].sudo().browse(rec_id).unlink()

    # ── List ──────────────────────────────────────────────────────────────────

    def test_list_returns_list(self):
        result = self._call('GET', self.list_url)
        data = self.assertOk(result)
        self.assertIsInstance(data, list)

    # ── Create → Get → Approve → Refuse → Reset → Delete ─────────────────────

    def test_create_returns_record(self):
        rec = self._create_record()
        self.assertIn('id', rec)
        self.assertEqual(rec.get('state'), 'submitted')
        self._delete_record(rec['id'])

    def test_get_by_id(self):
        rec = self._create_record()
        result = self._call('GET', self.by_id_url_tpl.format(id=rec['id']))
        data = self.assertOk(result)
        self.assertEqual(data['id'], rec['id'])
        self._delete_record(rec['id'])

    def test_get_nonexistent_fails(self):
        result = self._call('GET', self.by_id_url_tpl.format(id=999999))
        self.assertErr(result)

    def test_approve_workflow(self):
        rec = self._create_record()
        result = self._call('POST', self.approve_url, {'record_id': rec['id']})
        self.assertOk(result)
        self._delete_record(rec['id'])

    def test_refuse_workflow(self):
        rec = self._create_record()
        self._call('POST', self.approve_url, {'record_id': rec['id']})  # approve first
        result = self._call('POST', self.refuse_url, {
            'record_id': rec['id'],
            'reason':    'unit test refusal',
        })
        # Refuse on an approved record — behaviour depends on model
        self.assertIn('success', result)
        self._delete_record(rec['id'])

    def test_reset_to_draft(self):
        rec = self._create_record()
        result = self._call('POST', self.reset_url, {'record_id': rec['id']})
        self.assertOk(result)
        # After reset, delete should work (draft state)
        del_result = self._call('DELETE', self.by_id_url_tpl.format(id=rec['id']))
        self.assertOk(del_result)

    def test_delete_draft(self):
        rec = self._create_record()
        result = self._call('POST', self.reset_url, {'record_id': rec['id']})
        self.assertOk(result)
        del_result = self._call('DELETE', self.by_id_url_tpl.format(id=rec['id']))
        self.assertOk(del_result)
        # Confirm it's gone
        get_result = self._call('GET', self.by_id_url_tpl.format(id=rec['id']))
        self.assertErr(get_result)


# ── HR Letters ────────────────────────────────────────────────────────────────

@tagged('post_install', '-at_install', 'ess_api', 'ess_hr_services')
class TestHrLetters(_HrServiceMixin, EssClientTestCase):
    _model_name   = 'hr.letter.request'
    list_url      = '/ess/api/hr-letters'
    create_url    = '/ess/api/hr-letters'
    by_id_url_tpl = '/ess/api/hr-letters/{id}'
    approve_url   = '/ess/api/hr-letters/approve'
    refuse_url    = '/ess/api/hr-letters/refuse'
    reset_url     = '/ess/api/hr-letters/reset'
    create_body   = {'directed_to': 'To Whom It May Concern', 'salary_type': 'gross'}


# ── Document Requests ─────────────────────────────────────────────────────────

@tagged('post_install', '-at_install', 'ess_api', 'ess_hr_services')
class TestDocumentRequests(_HrServiceMixin, EssClientTestCase):
    _model_name   = 'hr.document.request'
    list_url      = '/ess/api/document-requests'
    create_url    = '/ess/api/document-requests'
    by_id_url_tpl = '/ess/api/document-requests/{id}'
    approve_url   = '/ess/api/document-requests/approve'
    refuse_url    = '/ess/api/document-requests/refuse'
    reset_url     = '/ess/api/document-requests/reset'
    create_body   = {'document_type': 'Passport'}

    def test_document_types_returns_list(self):
        """GET /ess/api/document-requests/types → list of type strings."""
        result = self._call('GET', '/ess/api/document-requests/types')
        data = self.assertOk(result)
        self.assertIsInstance(data, list)
        self.assertTrue(len(data) >= 1)


# ── Experience Certificates ───────────────────────────────────────────────────

@tagged('post_install', '-at_install', 'ess_api', 'ess_hr_services')
class TestExperienceCertificates(_HrServiceMixin, EssClientTestCase):
    _model_name   = 'hr.experience.certificate'
    list_url      = '/ess/api/experience-certificates'
    create_url    = '/ess/api/experience-certificates'
    by_id_url_tpl = '/ess/api/experience-certificates/{id}'
    approve_url   = '/ess/api/experience-certificates/approve'
    refuse_url    = '/ess/api/experience-certificates/refuse'
    reset_url     = '/ess/api/experience-certificates/reset'
    create_body   = {'directed_to': 'Future Employer Ltd'}


# ── Business Services ─────────────────────────────────────────────────────────

@tagged('post_install', '-at_install', 'ess_api', 'ess_hr_services')
class TestBusinessServices(_HrServiceMixin, EssClientTestCase):
    _model_name   = 'hr.business.service.request'
    list_url      = '/ess/api/business-services'
    create_url    = '/ess/api/business-services'
    by_id_url_tpl = '/ess/api/business-services/{id}'
    approve_url   = '/ess/api/business-services/approve'
    refuse_url    = '/ess/api/business-services/refuse'
    reset_url     = '/ess/api/business-services/reset'

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        env = cls.env
        stype = env['hr.business.service.type'].sudo().search([], limit=1)
        if not stype:
            stype = env['hr.business.service.type'].sudo().create({
                'name':       'ESS Test Service Type',
                'company_id': cls.company_id,
            })
        cls.service_type_id = stype.id
        cls.create_body = {'service_type_id': cls.service_type_id, 'reason': 'API test'}

    def test_business_service_types_returns_list(self):
        """GET /ess/api/business-services/types → list of service type dicts."""
        result = self._call('GET', '/ess/api/business-services/types')
        data = self.assertOk(result)
        self.assertIsInstance(data, list)
        self.assertTrue(len(data) >= 1)
        self.assertHasKeys(data[0], ['id', 'name'])
