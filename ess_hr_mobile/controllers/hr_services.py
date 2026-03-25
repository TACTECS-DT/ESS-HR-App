"""
HR Services controller — covers Letters, Document Requests,
Experience Certificates, and Business Service Requests.

All four models share the same approve/refuse/reset/CRUD pattern,
so each group is clearly separated by comment blocks.
"""
from odoo import http
from odoo.http import request

from .utils import call_and_log, get_body


class HrServicesController(http.Controller):

    # ── HR Letters ────────────────────────────────────────────────────────────

    @http.route('/ess/api/hr-letters/create', type='http', auth='none', methods=['POST'], csrf=False)
    def letter_create(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/hr-letters/create', employee_id,
            lambda: request.env['hr.letter.request'].sudo().create_letter(
                employee_id, kw.get('directed_to', ''), kw.get('salary_type', 'gross'),
            ),
        )

    @http.route('/ess/api/hr-letters/list', type='http', auth='none', methods=['POST'], csrf=False)
    def letter_list(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/hr-letters/list', employee_id,
            lambda: request.env['hr.letter.request'].sudo().get_letter_list(
                employee_id, kw.get('state_filter'),
            ),
        )

    @http.route('/ess/api/hr-letters/detail', type='http', auth='none', methods=['POST'], csrf=False)
    def letter_detail(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/hr-letters/detail', employee_id,
            lambda: request.env['hr.letter.request'].sudo().get_letter_detail(kw.get('record_id')),
        )

    @http.route('/ess/api/hr-letters/update', type='http', auth='none', methods=['POST'], csrf=False)
    def letter_update(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/hr-letters/update', employee_id,
            lambda: request.env['hr.letter.request'].sudo().update_letter(
                kw.get('record_id'), kw.get('vals', {}),
            ),
        )

    @http.route('/ess/api/hr-letters/delete', type='http', auth='none', methods=['POST'], csrf=False)
    def letter_delete(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/hr-letters/delete', employee_id,
            lambda: request.env['hr.letter.request'].sudo().delete_letter(kw.get('record_id')),
        )

    @http.route('/ess/api/hr-letters/approve', type='http', auth='none', methods=['POST'], csrf=False)
    def letter_approve(self):
        kw = get_body()
        approver_employee_id = kw.get('approver_employee_id')
        return call_and_log(
            '/ess/api/hr-letters/approve', approver_employee_id,
            lambda: request.env['hr.letter.request'].sudo().approve_letter(
                kw.get('record_id'), approver_employee_id,
            ),
        )

    @http.route('/ess/api/hr-letters/refuse', type='http', auth='none', methods=['POST'], csrf=False)
    def letter_refuse(self):
        kw = get_body()
        approver_employee_id = kw.get('approver_employee_id')
        return call_and_log(
            '/ess/api/hr-letters/refuse', approver_employee_id,
            lambda: request.env['hr.letter.request'].sudo().refuse_letter(
                kw.get('record_id'), approver_employee_id, kw.get('reason', ''),
            ),
        )

    @http.route('/ess/api/hr-letters/reset', type='http', auth='none', methods=['POST'], csrf=False)
    def letter_reset(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/hr-letters/reset', employee_id,
            lambda: request.env['hr.letter.request'].sudo().reset_letter(kw.get('record_id')),
        )

    # ── Document Requests ─────────────────────────────────────────────────────

    @http.route('/ess/api/documents/create', type='http', auth='none', methods=['POST'], csrf=False)
    def document_create(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/documents/create', employee_id,
            lambda: request.env['hr.document.request'].sudo().create_document(
                employee_id, kw.get('document_type'), kw.get('return_date', False),
            ),
        )

    @http.route('/ess/api/documents/list', type='http', auth='none', methods=['POST'], csrf=False)
    def document_list(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/documents/list', employee_id,
            lambda: request.env['hr.document.request'].sudo().get_document_list(
                employee_id, kw.get('state_filter'),
            ),
        )

    @http.route('/ess/api/documents/detail', type='http', auth='none', methods=['POST'], csrf=False)
    def document_detail(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/documents/detail', employee_id,
            lambda: request.env['hr.document.request'].sudo().get_document_detail(kw.get('record_id')),
        )

    @http.route('/ess/api/documents/update', type='http', auth='none', methods=['POST'], csrf=False)
    def document_update(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/documents/update', employee_id,
            lambda: request.env['hr.document.request'].sudo().update_document(
                kw.get('record_id'), kw.get('vals', {}),
            ),
        )

    @http.route('/ess/api/documents/delete', type='http', auth='none', methods=['POST'], csrf=False)
    def document_delete(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/documents/delete', employee_id,
            lambda: request.env['hr.document.request'].sudo().delete_document(kw.get('record_id')),
        )

    @http.route('/ess/api/documents/approve', type='http', auth='none', methods=['POST'], csrf=False)
    def document_approve(self):
        kw = get_body()
        approver_employee_id = kw.get('approver_employee_id')
        return call_and_log(
            '/ess/api/documents/approve', approver_employee_id,
            lambda: request.env['hr.document.request'].sudo().approve_document(
                kw.get('record_id'), approver_employee_id,
            ),
        )

    @http.route('/ess/api/documents/refuse', type='http', auth='none', methods=['POST'], csrf=False)
    def document_refuse(self):
        kw = get_body()
        approver_employee_id = kw.get('approver_employee_id')
        return call_and_log(
            '/ess/api/documents/refuse', approver_employee_id,
            lambda: request.env['hr.document.request'].sudo().refuse_document(
                kw.get('record_id'), approver_employee_id, kw.get('reason', ''),
            ),
        )

    @http.route('/ess/api/documents/reset', type='http', auth='none', methods=['POST'], csrf=False)
    def document_reset(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/documents/reset', employee_id,
            lambda: request.env['hr.document.request'].sudo().reset_document(kw.get('record_id')),
        )

    # ── Experience Certificates ───────────────────────────────────────────────

    @http.route('/ess/api/certificates/create', type='http', auth='none', methods=['POST'], csrf=False)
    def certificate_create(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/certificates/create', employee_id,
            lambda: request.env['hr.experience.certificate'].sudo().create_certificate(
                employee_id, kw.get('directed_to', ''),
            ),
        )

    @http.route('/ess/api/certificates/list', type='http', auth='none', methods=['POST'], csrf=False)
    def certificate_list(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/certificates/list', employee_id,
            lambda: request.env['hr.experience.certificate'].sudo().get_certificate_list(
                employee_id, kw.get('state_filter'),
            ),
        )

    @http.route('/ess/api/certificates/detail', type='http', auth='none', methods=['POST'], csrf=False)
    def certificate_detail(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/certificates/detail', employee_id,
            lambda: request.env['hr.experience.certificate'].sudo().get_certificate_detail(
                kw.get('record_id'),
            ),
        )

    @http.route('/ess/api/certificates/update', type='http', auth='none', methods=['POST'], csrf=False)
    def certificate_update(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/certificates/update', employee_id,
            lambda: request.env['hr.experience.certificate'].sudo().update_certificate(
                kw.get('record_id'), kw.get('vals', {}),
            ),
        )

    @http.route('/ess/api/certificates/delete', type='http', auth='none', methods=['POST'], csrf=False)
    def certificate_delete(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/certificates/delete', employee_id,
            lambda: request.env['hr.experience.certificate'].sudo().delete_certificate(
                kw.get('record_id'),
            ),
        )

    @http.route('/ess/api/certificates/approve', type='http', auth='none', methods=['POST'], csrf=False)
    def certificate_approve(self):
        kw = get_body()
        approver_employee_id = kw.get('approver_employee_id')
        return call_and_log(
            '/ess/api/certificates/approve', approver_employee_id,
            lambda: request.env['hr.experience.certificate'].sudo().approve_certificate(
                kw.get('record_id'), approver_employee_id,
            ),
        )

    @http.route('/ess/api/certificates/refuse', type='http', auth='none', methods=['POST'], csrf=False)
    def certificate_refuse(self):
        kw = get_body()
        approver_employee_id = kw.get('approver_employee_id')
        return call_and_log(
            '/ess/api/certificates/refuse', approver_employee_id,
            lambda: request.env['hr.experience.certificate'].sudo().refuse_certificate(
                kw.get('record_id'), approver_employee_id, kw.get('reason', ''),
            ),
        )

    @http.route('/ess/api/certificates/reset', type='http', auth='none', methods=['POST'], csrf=False)
    def certificate_reset(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/certificates/reset', employee_id,
            lambda: request.env['hr.experience.certificate'].sudo().reset_certificate(
                kw.get('record_id'),
            ),
        )

    # ── Business Services ─────────────────────────────────────────────────────

    @http.route('/ess/api/business-services/types', type='http', auth='none', methods=['POST'], csrf=False)
    def business_service_types(self):
        kw = get_body()
        return call_and_log(
            '/ess/api/business-services/types', None,
            lambda: request.env['hr.business.service.request'].sudo().get_business_service_types(
                kw.get('company_id'),
            ),
        )

    @http.route('/ess/api/business-services/create', type='http', auth='none', methods=['POST'], csrf=False)
    def business_service_create(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/business-services/create', employee_id,
            lambda: request.env['hr.business.service.request'].sudo().create_business_service(
                employee_id, kw.get('service_type_id'), kw.get('reason', ''),
                kw.get('requested_date', False),
            ),
        )

    @http.route('/ess/api/business-services/list', type='http', auth='none', methods=['POST'], csrf=False)
    def business_service_list(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/business-services/list', employee_id,
            lambda: request.env['hr.business.service.request'].sudo().get_business_service_list(
                employee_id, kw.get('state_filter'),
            ),
        )

    @http.route('/ess/api/business-services/detail', type='http', auth='none', methods=['POST'], csrf=False)
    def business_service_detail(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/business-services/detail', employee_id,
            lambda: request.env['hr.business.service.request'].sudo().get_business_service_detail(
                kw.get('record_id'),
            ),
        )

    @http.route('/ess/api/business-services/update', type='http', auth='none', methods=['POST'], csrf=False)
    def business_service_update(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/business-services/update', employee_id,
            lambda: request.env['hr.business.service.request'].sudo().update_business_service(
                kw.get('record_id'), kw.get('vals', {}),
            ),
        )

    @http.route('/ess/api/business-services/delete', type='http', auth='none', methods=['POST'], csrf=False)
    def business_service_delete(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/business-services/delete', employee_id,
            lambda: request.env['hr.business.service.request'].sudo().delete_business_service(
                kw.get('record_id'),
            ),
        )

    @http.route('/ess/api/business-services/approve', type='http', auth='none', methods=['POST'], csrf=False)
    def business_service_approve(self):
        kw = get_body()
        approver_employee_id = kw.get('approver_employee_id')
        return call_and_log(
            '/ess/api/business-services/approve', approver_employee_id,
            lambda: request.env['hr.business.service.request'].sudo().approve_business_service(
                kw.get('record_id'), approver_employee_id,
            ),
        )

    @http.route('/ess/api/business-services/refuse', type='http', auth='none', methods=['POST'], csrf=False)
    def business_service_refuse(self):
        kw = get_body()
        approver_employee_id = kw.get('approver_employee_id')
        return call_and_log(
            '/ess/api/business-services/refuse', approver_employee_id,
            lambda: request.env['hr.business.service.request'].sudo().refuse_business_service(
                kw.get('record_id'), approver_employee_id, kw.get('reason', ''),
            ),
        )

    @http.route('/ess/api/business-services/reset', type='http', auth='none', methods=['POST'], csrf=False)
    def business_service_reset(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/business-services/reset', employee_id,
            lambda: request.env['hr.business.service.request'].sudo().reset_business_service(
                kw.get('record_id'),
            ),
        )
