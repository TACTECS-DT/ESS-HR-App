import base64
from odoo import models, fields, api, _
from odoo.exceptions import UserError


class HrPayslipExt(models.Model):
    _name = 'hr.payslip'
    _inherit = ['hr.payslip', 'ess.mixin']

    @api.model
    def get_payslips(self, employee_id, year=None, month=None):
        """Return list of payslip summary dicts for the employee, filtered by year/month."""
        employee = self._get_employee(employee_id)
        domain = [('employee_id', '=', employee_id), ('state', 'in', ['done', 'paid'])]
        if year:
            domain.append(('date_from', '>=', '%d-01-01' % year))
            domain.append(('date_from', '<=', '%d-12-31' % year))
        if month and year:
            import calendar
            _, last_day = calendar.monthrange(year, month)
            domain.append(('date_from', '>=', '%d-%02d-01' % (year, month)))
            domain.append(('date_from', '<=', '%d-%02d-%02d' % (year, month, last_day)))
        slips = self.sudo().search(domain, order='date_from desc')
        return [self._format_payslip_summary(s) for s in slips]

    @api.model
    def get_payslip_detail(self, payslip_id):
        """Return a full payslip dict with earnings, deductions, and net pay."""
        slip = self.sudo().browse(payslip_id)
        if not slip.exists():
            raise UserError(_('Payslip not found.'))
        result = self._format_payslip_summary(slip)
        result.update(self._format_payslip_lines(slip))
        return result

    @api.model
    def get_payslip_pdf(self, payslip_id):
        """Return the payslip PDF as a base64-encoded string."""
        slip = self.sudo().browse(payslip_id)
        if not slip.exists():
            raise UserError(_('Payslip not found.'))
        return self._generate_payslip_pdf(slip)

    def _format_payslip_summary(self, slip):
        """Format a payslip record into a summary dict."""
        return {
            'id': slip.id,
            'name': slip.name or '',
            'employee_id': slip.employee_id.id,
            'employee_name': slip.employee_id.name,
            'date_from': slip.date_from.strftime('%Y-%m-%d') if slip.date_from else False,
            'date_to': slip.date_to.strftime('%Y-%m-%d') if slip.date_to else False,
            'state': slip.state,
            'company_id': slip.company_id.id if slip.company_id else False,
            'company_name': slip.company_id.name if slip.company_id else '',
            'currency': slip.company_id.currency_id.name if slip.company_id else '',
        }

    def _format_payslip_lines(self, slip):
        """Format payslip lines into earnings, deductions, and net_pay dict."""
        earnings = []
        deductions = []
        net_pay = 0.0
        for line in slip.line_ids:
            category_code = line.category_id.code if line.category_id else ''
            entry = {
                'id': line.id,
                'name': line.name,
                'code': line.code,
                'amount': line.total,
                'category': category_code,
            }
            if category_code in ('BASIC', 'ALW', 'GROSS'):
                earnings.append(entry)
            elif category_code in ('DED', 'COMP'):
                deductions.append(entry)
            elif category_code == 'NET':
                net_pay = line.total
        return {
            'earnings': earnings,
            'deductions': deductions,
            'net_pay': net_pay,
        }

    def _generate_payslip_pdf(self, slip):
        """Render and return the payslip PDF as a base64-encoded string."""
        try:
            report = self.env.ref('hr_payroll.action_report_payslip')
            pdf_content, _ = self.env['ir.actions.report'].sudo()._render_qweb_pdf(
                report, slip.ids
            )
            return base64.b64encode(pdf_content).decode('utf-8')
        except Exception as e:
            raise UserError(_('Could not generate payslip PDF: %s') % str(e))
