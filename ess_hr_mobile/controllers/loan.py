from odoo import http
from odoo.http import request

from .utils import call_and_log, get_body


class LoanController(http.Controller):

    @http.route('/ess/api/loan/rules', type='http', auth='none', methods=['POST'], csrf=False)
    def rules(self):
        kw = get_body()
        return call_and_log(
            '/ess/api/loan/rules', None,
            lambda: request.env['hr.loan'].sudo().get_loan_rules(kw.get('company_id')),
        )

    @http.route('/ess/api/loan/create', type='http', auth='none', methods=['POST'], csrf=False)
    def create(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/loan/create', employee_id,
            lambda: request.env['hr.loan'].sudo().create_loan(
                employee_id,
                kw.get('amount'),
                kw.get('duration_months'),
                kw.get('transfer_method', 'bank'),
            ),
        )

    @http.route('/ess/api/loan/list', type='http', auth='none', methods=['POST'], csrf=False)
    def list(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/loan/list', employee_id,
            lambda: request.env['hr.loan'].sudo().get_loans(employee_id),
        )

    @http.route('/ess/api/loan/detail', type='http', auth='none', methods=['POST'], csrf=False)
    def detail(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/loan/detail', employee_id,
            lambda: request.env['hr.loan'].sudo().get_loan_detail(kw.get('loan_id')),
        )

    @http.route('/ess/api/loan/approve', type='http', auth='none', methods=['POST'], csrf=False)
    def approve(self):
        kw = get_body()
        approver_employee_id = kw.get('approver_employee_id')
        return call_and_log(
            '/ess/api/loan/approve', approver_employee_id,
            lambda: request.env['hr.loan'].sudo().approve_loan(kw.get('loan_id'), approver_employee_id),
        )

    @http.route('/ess/api/loan/refuse', type='http', auth='none', methods=['POST'], csrf=False)
    def refuse(self):
        kw = get_body()
        approver_employee_id = kw.get('approver_employee_id')
        return call_and_log(
            '/ess/api/loan/refuse', approver_employee_id,
            lambda: request.env['hr.loan'].sudo().refuse_loan(
                kw.get('loan_id'), approver_employee_id, kw.get('reason', ''),
            ),
        )
