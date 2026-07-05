# import base64
# from odoo import models, api, _, SUPERUSER_ID
# from odoo.exceptions import UserError, AccessError
#
#
# class HrPayslipExt(models.Model):
#     _name = 'hr.payslip'
#     _inherit = ['hr.payslip', 'ess.mixin']
#
#     # Odoo state → mobile app status
#     _STATE_MAP = {
#         'draft':  'draft',
#         'verify': 'waiting',
#         'done':   'done',
#         'paid':   'paid',
#         'cancel': 'rejected',
#     }
#
#     @api.model
#     def get_payslips(self, employee_id, year=None, month=None):
#         """Return payslip list for the employee (done/paid only), filtered by year/month."""
#         self._get_employee(employee_id)
#         domain = [('employee_id', '=', employee_id), ('state', 'in', ['done', 'paid'])]
#         if year:
#             domain += [('date_from', '>=', '%d-01-01' % int(year)),
#                        ('date_from', '<=', '%d-12-31' % int(year))]
#         if month and year:
#             import calendar
#             _, last_day = calendar.monthrange(int(year), int(month))
#             domain += [('date_from', '>=', '%d-%02d-01' % (int(year), int(month))),
#                        ('date_from', '<=', '%d-%02d-%02d' % (int(year), int(month), last_day))]
#         slips = self.with_user(SUPERUSER_ID).search(domain, order='date_from desc')
#         return [self._format_payslip(s) for s in slips]
#
#     @api.model
#     def get_payslip_detail(self, payslip_id, employee_id):
#         """Return a single payslip dict."""
#         slip = self.with_user(SUPERUSER_ID).browse(payslip_id)
#         if not slip.exists():
#             raise UserError(_('Payslip not found.'))
#         if slip.employee_id.id != employee_id:
#             raise AccessError(_('Access denied: this payslip belongs to another employee.'))
#         return self._format_payslip(slip)
#
#     @api.model
#     def get_payslip_pdf(self, payslip_id, employee_id):
#         """Return the payslip PDF as a base64-encoded string."""
#         slip = self.with_user(SUPERUSER_ID).browse(payslip_id)
#         if not slip.exists():
#             raise UserError(_('Payslip not found.'))
#         if slip.employee_id.id != employee_id:
#             raise AccessError(_('Access denied: this payslip belongs to another employee.'))
#         return self._generate_payslip_pdf(slip)
#
#     def _format_payslip(self, slip):
#         """Return a payslip dict matching the mobile app Payslip type exactly."""
#         earnings = []
#         deduction_lines = []
#         gross = 0.0
#         deductions = 0.0
#         net = 0.0
#         for line in slip.line_ids:
#             cat = line.category_id.code if line.category_id else ''
#             entry = {
#                 'code':    line.code or '',
#                 'name':    line.name or '',
#                 'name_ar': getattr(line, 'name_ar', '') or line.name or '',
#                 'amount':  line.total,
#             }
#             if cat in ('BASIC', 'ALW', 'GROSS'):
#                 earnings.append(entry)
#                 gross += line.total
#             elif cat in ('DED', 'COMP'):
#                 deduction_lines.append(entry)
#                 deductions += abs(line.total)
#             elif cat == 'NET':
#                 net = line.total
#         return {
#             'id':              slip.id,
#             'employee_id':     slip.employee_id.id,
#             'month':           slip.date_from.month if slip.date_from else False,
#             'year':            slip.date_from.year if slip.date_from else False,
#             'status':          self._STATE_MAP.get(slip.state, slip.state),
#             'gross':           round(gross, 2),
#             'deductions':      round(deductions, 2),
#             'net':             round(net, 2),
#             'currency':        slip.company_id.currency_id.name if slip.company_id else '',
#             'earnings':        earnings,
#             'deduction_lines': deduction_lines,
#         }
#
#     def _generate_payslip_pdf(self, slip):
#         """Render and return the payslip PDF as a base64-encoded string."""
#         try:
#             report = self.env.ref('hr_payroll.action_report_payslip')
#             pdf_content, _pdf_type = self.env['ir.actions.report'].with_user(SUPERUSER_ID)._render_qweb_pdf(
#                 report, slip.ids
#             )
#             return base64.b64encode(pdf_content).decode('utf-8')
#         except Exception as e:
#             raise UserError(_('Could not generate payslip PDF: %s') % str(e))
