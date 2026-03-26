from odoo import http
from odoo.http import request

from .utils import call_and_log, get_body


class PayslipController(http.Controller):

    @http.route('/ess/api/payslip', type='http', auth='none', methods=['GET', 'POST'], csrf=False)
    def list(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/payslip',
            lambda: request.env['hr.payslip'].sudo().get_payslips(
                employee_id, kw.get('year'), kw.get('month'),
            ),
        )

    @http.route('/ess/api/payslip/<int:payslip_id>', type='http', auth='none', methods=['GET'], csrf=False)
    def by_id(self, payslip_id):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/payslip/<id>',
            lambda: request.env['hr.payslip'].sudo().get_payslip_detail(payslip_id),
        )

    @http.route('/ess/api/payslip/pdf', type='http', auth='none', methods=['POST'], csrf=False)
    def pdf(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/payslip/pdf',
            lambda: request.env['hr.payslip'].sudo().get_payslip_pdf(kw.get('payslip_id')),
        )
