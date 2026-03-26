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

    @http.route('/ess/api/hr-letters', type='http', auth='none', methods=['GET', 'POST'], csrf=False)
    def letters(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        if request.httprequest.method == 'GET':
            return call_and_log(
                '/ess/api/hr-letters',
                lambda: request.env['hr.letter.request'].sudo().get_letter_list(
                    employee_id, kw.get('state_filter'),
                ),
            )
        return call_and_log(
            '/ess/api/hr-letters',
            lambda: request.env['hr.letter.request'].sudo().create_letter(
                employee_id, kw.get('directed_to', ''), kw.get('salary_type', 'gross'),
            ),
        )

    @http.route('/ess/api/hr-letters/<int:letter_id>', type='http', auth='none', methods=['GET', 'PATCH', 'DELETE'], csrf=False)
    def letter_by_id(self, letter_id):
        kw = get_body()
        employee_id = kw.get('employee_id')
        method = request.httprequest.method
        if method == 'GET':
            return call_and_log(
                '/ess/api/hr-letters/<id>',
                lambda: request.env['hr.letter.request'].sudo().get_letter_detail(letter_id),
            )
        if method == 'PATCH':
            return call_and_log(
                '/ess/api/hr-letters/<id>',
                lambda: request.env['hr.letter.request'].sudo().update_letter(
                    letter_id, kw.get('vals', {}),
                ),
            )
        # DELETE
        return call_and_log(
            '/ess/api/hr-letters/<id>',
            lambda: request.env['hr.letter.request'].sudo().delete_letter(letter_id),
        )

    @http.route('/ess/api/hr-letters/approve', type='http', auth='none', methods=['POST'], csrf=False)
    def letter_approve(self):
        kw = get_body()
        approver_employee_id = kw.get('approver_employee_id')
        return call_and_log(
            '/ess/api/hr-letters/approve',
            lambda: request.env['hr.letter.request'].sudo().approve_letter(
                kw.get('record_id'), approver_employee_id,
            ),
        )

    @http.route('/ess/api/hr-letters/refuse', type='http', auth='none', methods=['POST'], csrf=False)
    def letter_refuse(self):
        kw = get_body()
        approver_employee_id = kw.get('approver_employee_id')
        return call_and_log(
            '/ess/api/hr-letters/refuse',
            lambda: request.env['hr.letter.request'].sudo().refuse_letter(
                kw.get('record_id'), approver_employee_id, kw.get('reason', ''),
            ),
        )

    @http.route('/ess/api/hr-letters/reset', type='http', auth='none', methods=['POST'], csrf=False)
    def letter_reset(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/hr-letters/reset',
            lambda: request.env['hr.letter.request'].sudo().reset_letter(kw.get('record_id')),
        )

    # ── Document Requests ─────────────────────────────────────────────────────

    @http.route('/ess/api/document-requests/types', type='http', auth='none', methods=['GET', 'POST'], csrf=False)
    def document_types(self):
        kw = get_body()
        return call_and_log(
            '/ess/api/document-requests/types',
            lambda: [],  # stub — available document request types
        )

    @http.route('/ess/api/document-requests', type='http', auth='none', methods=['GET', 'POST'], csrf=False)
    def document_requests(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        if request.httprequest.method == 'GET':
            return call_and_log(
                '/ess/api/document-requests',
                lambda: request.env['hr.document.request'].sudo().get_document_list(
                    employee_id, kw.get('state_filter'),
                ),
            )
        return call_and_log(
            '/ess/api/document-requests',
            lambda: request.env['hr.document.request'].sudo().create_document(
                employee_id, kw.get('document_type'), kw.get('return_date', False),
            ),
        )

    @http.route('/ess/api/document-requests/<int:doc_id>', type='http', auth='none', methods=['GET', 'PATCH', 'DELETE'], csrf=False)
    def document_by_id(self, doc_id):
        kw = get_body()
        employee_id = kw.get('employee_id')
        method = request.httprequest.method
        if method == 'GET':
            return call_and_log(
                '/ess/api/document-requests/<id>',
                lambda: request.env['hr.document.request'].sudo().get_document_detail(doc_id),
            )
        if method == 'PATCH':
            return call_and_log(
                '/ess/api/document-requests/<id>',
                lambda: request.env['hr.document.request'].sudo().update_document(
                    doc_id, kw.get('vals', {}),
                ),
            )
        # DELETE
        return call_and_log(
            '/ess/api/document-requests/<id>',
            lambda: request.env['hr.document.request'].sudo().delete_document(doc_id),
        )

    @http.route('/ess/api/document-requests/approve', type='http', auth='none', methods=['POST'], csrf=False)
    def document_approve(self):
        kw = get_body()
        approver_employee_id = kw.get('approver_employee_id')
        return call_and_log(
            '/ess/api/document-requests/approve',
            lambda: request.env['hr.document.request'].sudo().approve_document(
                kw.get('record_id'), approver_employee_id,
            ),
        )

    @http.route('/ess/api/document-requests/refuse', type='http', auth='none', methods=['POST'], csrf=False)
    def document_refuse(self):
        kw = get_body()
        approver_employee_id = kw.get('approver_employee_id')
        return call_and_log(
            '/ess/api/document-requests/refuse',
            lambda: request.env['hr.document.request'].sudo().refuse_document(
                kw.get('record_id'), approver_employee_id, kw.get('reason', ''),
            ),
        )

    @http.route('/ess/api/document-requests/reset', type='http', auth='none', methods=['POST'], csrf=False)
    def document_reset(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/document-requests/reset',
            lambda: request.env['hr.document.request'].sudo().reset_document(kw.get('record_id')),
        )

    # ── Experience Certificates ───────────────────────────────────────────────

    @http.route('/ess/api/experience-certificates', type='http', auth='none', methods=['GET', 'POST'], csrf=False)
    def certificates(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        if request.httprequest.method == 'GET':
            return call_and_log(
                '/ess/api/experience-certificates',
                lambda: request.env['hr.experience.certificate'].sudo().get_certificate_list(
                    employee_id, kw.get('state_filter'),
                ),
            )
        return call_and_log(
            '/ess/api/experience-certificates',
            lambda: request.env['hr.experience.certificate'].sudo().create_certificate(
                employee_id, kw.get('directed_to', ''),
            ),
        )

    @http.route('/ess/api/experience-certificates/<int:cert_id>', type='http', auth='none', methods=['GET', 'PATCH', 'DELETE'], csrf=False)
    def certificate_by_id(self, cert_id):
        kw = get_body()
        employee_id = kw.get('employee_id')
        method = request.httprequest.method
        if method == 'GET':
            return call_and_log(
                '/ess/api/experience-certificates/<id>',
                lambda: request.env['hr.experience.certificate'].sudo().get_certificate_detail(cert_id),
            )
        if method == 'PATCH':
            return call_and_log(
                '/ess/api/experience-certificates/<id>',
                lambda: request.env['hr.experience.certificate'].sudo().update_certificate(
                    cert_id, kw.get('vals', {}),
                ),
            )
        # DELETE
        return call_and_log(
            '/ess/api/experience-certificates/<id>',
            lambda: request.env['hr.experience.certificate'].sudo().delete_certificate(cert_id),
        )

    @http.route('/ess/api/experience-certificates/approve', type='http', auth='none', methods=['POST'], csrf=False)
    def certificate_approve(self):
        kw = get_body()
        approver_employee_id = kw.get('approver_employee_id')
        return call_and_log(
            '/ess/api/experience-certificates/approve',
            lambda: request.env['hr.experience.certificate'].sudo().approve_certificate(
                kw.get('record_id'), approver_employee_id,
            ),
        )

    @http.route('/ess/api/experience-certificates/refuse', type='http', auth='none', methods=['POST'], csrf=False)
    def certificate_refuse(self):
        kw = get_body()
        approver_employee_id = kw.get('approver_employee_id')
        return call_and_log(
            '/ess/api/experience-certificates/refuse',
            lambda: request.env['hr.experience.certificate'].sudo().refuse_certificate(
                kw.get('record_id'), approver_employee_id, kw.get('reason', ''),
            ),
        )

    @http.route('/ess/api/experience-certificates/reset', type='http', auth='none', methods=['POST'], csrf=False)
    def certificate_reset(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/experience-certificates/reset',
            lambda: request.env['hr.experience.certificate'].sudo().reset_certificate(
                kw.get('record_id'),
            ),
        )

    # ── Business Services ─────────────────────────────────────────────────────

    @http.route('/ess/api/business-services/types', type='http', auth='none', methods=['GET', 'POST'], csrf=False)
    def business_service_types(self):
        kw = get_body()
        return call_and_log(
            '/ess/api/business-services/types',
            lambda: request.env['hr.business.service.request'].sudo().get_business_service_types(
                kw.get('company_id'),
            ),
        )

    @http.route('/ess/api/business-services', type='http', auth='none', methods=['GET', 'POST'], csrf=False)
    def business_services(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        if request.httprequest.method == 'GET':
            return call_and_log(
                '/ess/api/business-services',
                lambda: request.env['hr.business.service.request'].sudo().get_business_service_list(
                    employee_id, kw.get('state_filter'),
                ),
            )
        return call_and_log(
            '/ess/api/business-services',
            lambda: request.env['hr.business.service.request'].sudo().create_business_service(
                employee_id, kw.get('service_type_id'), kw.get('reason', ''),
                kw.get('requested_date', False),
            ),
        )

    @http.route('/ess/api/business-services/<int:service_id>', type='http', auth='none', methods=['GET', 'PATCH', 'DELETE'], csrf=False)
    def business_service_by_id(self, service_id):
        kw = get_body()
        employee_id = kw.get('employee_id')
        method = request.httprequest.method
        if method == 'GET':
            return call_and_log(
                '/ess/api/business-services/<id>',
                lambda: request.env['hr.business.service.request'].sudo().get_business_service_detail(
                    service_id,
                ),
            )
        if method == 'PATCH':
            return call_and_log(
                '/ess/api/business-services/<id>',
                lambda: request.env['hr.business.service.request'].sudo().update_business_service(
                    service_id, kw.get('vals', {}),
                ),
            )
        # DELETE
        return call_and_log(
            '/ess/api/business-services/<id>',
            lambda: request.env['hr.business.service.request'].sudo().delete_business_service(
                service_id,
            ),
        )

    @http.route('/ess/api/business-services/approve', type='http', auth='none', methods=['POST'], csrf=False)
    def business_service_approve(self):
        kw = get_body()
        approver_employee_id = kw.get('approver_employee_id')
        return call_and_log(
            '/ess/api/business-services/approve',
            lambda: request.env['hr.business.service.request'].sudo().approve_business_service(
                kw.get('record_id'), approver_employee_id,
            ),
        )

    @http.route('/ess/api/business-services/refuse', type='http', auth='none', methods=['POST'], csrf=False)
    def business_service_refuse(self):
        kw = get_body()
        approver_employee_id = kw.get('approver_employee_id')
        return call_and_log(
            '/ess/api/business-services/refuse',
            lambda: request.env['hr.business.service.request'].sudo().refuse_business_service(
                kw.get('record_id'), approver_employee_id, kw.get('reason', ''),
            ),
        )

    @http.route('/ess/api/business-services/reset', type='http', auth='none', methods=['POST'], csrf=False)
    def business_service_reset(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/business-services/reset',
            lambda: request.env['hr.business.service.request'].sudo().reset_business_service(
                kw.get('record_id'),
            ),
        )
