from odoo import http
from odoo.http import request

from .utils import call_and_log, get_body


class LoanController(http.Controller):

    @http.route('/ess/api/loans/rules', type='http', auth='none', methods=['GET', 'POST'], csrf=False)
    def rules(self):
        kw = get_body()
        return call_and_log(
            '/ess/api/loans/rules', None,
            lambda: request.env['hr.loan'].sudo().get_loan_rules(kw.get('company_id')),
        )

    @http.route('/ess/api/loans', type='http', auth='none', methods=['GET', 'POST'], csrf=False)
    def loans(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        if request.httprequest.method == 'GET':
            return call_and_log(
                '/ess/api/loans', employee_id,
                lambda: request.env['hr.loan'].sudo().get_loans(employee_id),
            )
        return call_and_log(
            '/ess/api/loans', employee_id,
            lambda: request.env['hr.loan'].sudo().create_loan(
                employee_id,
                kw.get('amount'),
                kw.get('duration_months'),
                kw.get('transfer_method', 'bank'),
            ),
        )

    @http.route('/ess/api/loans/<int:loan_id>', type='http', auth='none', methods=['GET'], csrf=False)
    def loan_by_id(self, loan_id):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/loans/<id>', employee_id,
            lambda: request.env['hr.loan'].sudo().get_loan_detail(loan_id),
        )

    @http.route('/ess/api/loans/approve', type='http', auth='none', methods=['POST'], csrf=False)
    def approve(self):
        kw = get_body()
        approver_employee_id = kw.get('approver_employee_id')
        return call_and_log(
            '/ess/api/loans/approve', approver_employee_id,
            lambda: request.env['hr.loan'].sudo().approve_loan(kw.get('loan_id'), approver_employee_id),
        )

    @http.route('/ess/api/loans/refuse', type='http', auth='none', methods=['POST'], csrf=False)
    def refuse(self):
        kw = get_body()
        approver_employee_id = kw.get('approver_employee_id')
        return call_and_log(
            '/ess/api/loans/refuse', approver_employee_id,
            lambda: request.env['hr.loan'].sudo().refuse_loan(
                kw.get('loan_id'), approver_employee_id, kw.get('reason', ''),
            ),
        )
