from odoo import http
from odoo.http import request

from .utils import call_and_log, get_body


class PayslipController(http.Controller):

    @http.route('/ess/api/payslip/list', type='http', auth='none', methods=['POST'], csrf=False)
    def list(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/payslip/list', employee_id,
            lambda: request.env['hr.payslip'].sudo().get_payslips(
                employee_id, kw.get('year'), kw.get('month'),
            ),
        )

    @http.route('/ess/api/payslip/detail', type='http', auth='none', methods=['POST'], csrf=False)
    def detail(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/payslip/detail', employee_id,
            lambda: request.env['hr.payslip'].sudo().get_payslip_detail(kw.get('payslip_id')),
        )

    @http.route('/ess/api/payslip/pdf', type='http', auth='none', methods=['POST'], csrf=False)
    def pdf(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/payslip/pdf', employee_id,
            lambda: request.env['hr.payslip'].sudo().get_payslip_pdf(kw.get('payslip_id')),
        )
