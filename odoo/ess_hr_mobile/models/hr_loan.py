from datetime import date
from dateutil.relativedelta import relativedelta
from odoo import models, fields, api, _
from odoo.exceptions import UserError


class HrLoanConfig(models.Model):
    _name = 'hr.loan.config'
    _description = 'Loan Configuration per Company'
    _rec_name = 'company_id'
    _inherit = ['ess.mixin']

    company_id = fields.Many2one('res.company', string='Company', required=True, ondelete='cascade')
    min_hiring_months = fields.Integer(string='Minimum Hiring Months', default=6)
    max_duration_months = fields.Integer(string='Maximum Duration (Months)', default=24)
    min_gap_months = fields.Integer(string='Minimum Gap Between Loans (Months)', default=3)
    max_amount_percentage = fields.Float(
        string='Max Amount as Months Salary',
        default=3.0,
        help='Number of basic salary months allowed as maximum loan amount.',
    )

    _company_unique = models.Constraint(
        'UNIQUE(company_id)',
        'Only one loan config per company is allowed.',
    )


class HrLoanInstallment(models.Model):
    _name = 'hr.loan.installment'
    _description = 'Loan Installment'
    _order = 'sequence asc'

    loan_id = fields.Many2one('hr.loan', string='Loan', required=True, ondelete='cascade')
    sequence = fields.Integer(string='Sequence', default=1)
    date = fields.Date(string='Due Date')
    amount = fields.Float(string='Amount', digits=(16, 2))
    paid = fields.Boolean(string='Paid', default=False)


class HrLoan(models.Model):
    _name = 'hr.loan'
    _description = 'Employee Loan'
    _rec_name = 'name'
    _order = 'request_date desc'
    _inherit = ['ess.mixin']

    name = fields.Char(string='Loan Reference', readonly=True, copy=False, default='New')
    employee_id = fields.Many2one('hr.employee', string='Employee', required=True, ondelete='cascade')
    company_id = fields.Many2one(
        'res.company', string='Company',
        related='employee_id.company_id', store=True,
    )
    amount = fields.Float(string='Loan Amount', digits=(16, 2), required=True)
    duration_months = fields.Integer(string='Duration (Months)', required=True)
    transfer_method = fields.Selection(
        selection=[('bank', 'Bank Transfer'), ('cash', 'Cash'), ('cheque', 'Cheque')],
        string='Transfer Method',
        required=True,
        default='bank',
    )
    state = fields.Selection(
        selection=[
            ('draft', 'Draft'),
            ('submitted', 'Submitted'),
            ('approved', 'Approved'),
            ('refused', 'Refused'),
            ('cancelled', 'Cancelled'),
        ],
        string='Status',
        default='draft',
        required=True,
    )
    reason_refusal = fields.Text(string='Reason for Refusal')
    approved_by = fields.Many2one('hr.employee', string='Approved By')
    approved_date = fields.Date(string='Approval Date')
    request_date = fields.Date(string='Request Date', default=fields.Date.today)
    installment_ids = fields.One2many('hr.loan.installment', 'loan_id', string='Installments')

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get('name', 'New') == 'New':
                vals['name'] = self.env['ir.sequence'].next_by_code('hr.loan') or 'New'
        return super().create(vals_list)

    @api.model
    def get_loan_rules(self, company_id):
        """Return the loan configuration dict for the given company."""
        config = self.env['hr.loan.config'].sudo().search([('company_id', '=', company_id)], limit=1)
        if not config:
            return {
                'min_hiring_months': 6,
                'max_duration_months': 24,
                'min_gap_months': 3,
                'max_amount_percentage': 3.0,
            }
        return {
            'min_hiring_months': config.min_hiring_months,
            'max_duration_months': config.max_duration_months,
            'min_gap_months': config.min_gap_months,
            'max_amount_percentage': config.max_amount_percentage,
        }

    @api.model
    def create_loan(self, employee_id, amount, duration_months, transfer_method):
        """Validate loan rules and create a new loan request. Returns loan dict."""
        employee = self._get_employee(employee_id)
        company_id = employee.company_id.id if employee.company_id else False
        self._validate_loan_rules(employee, amount, duration_months, company_id)
        loan = self.sudo().create({
            'employee_id': employee_id,
            'amount': amount,
            'duration_months': duration_months,
            'transfer_method': transfer_method,
            'state': 'submitted',
            'request_date': fields.Date.today(),
        })
        self._generate_installments(loan)
        return self._format_loan_record(loan)

    @api.model
    def get_loans(self, employee_id):
        """Return list of loan records for the given employee."""
        employee = self.env['hr.employee'].sudo().browse(employee_id)
        if not employee.exists():
            raise UserError(_('Employee not found.'))
        loans = self.sudo().search([('employee_id', '=', employee_id)], order='request_date desc')
        return [self._format_loan_record(l) for l in loans]

    @api.model
    def get_loan_detail(self, loan_id):
        """Return a full loan dict including installment schedule."""
        loan = self.sudo().browse(loan_id)
        if not loan.exists():
            raise UserError(_('Loan not found.'))
        result = self._format_loan_record(loan)
        result['installments'] = [self._format_installment(i) for i in loan.installment_ids]
        return result

    @api.model
    def approve_loan(self, loan_id, approver_employee_id):
        """Approve a loan request. Returns True."""
        loan = self.sudo().browse(loan_id)
        if not loan.exists():
            raise UserError(_('Loan not found.'))
        if loan.state not in ('draft', 'submitted'):
            raise UserError(_('Only draft or submitted loans can be approved.'))
        self._get_employee(approver_employee_id)
        loan.sudo().write({
            'state': 'approved',
            'approved_by': approver_employee_id,
            'approved_date': fields.Date.today(),
        })
        return True

    @api.model
    def refuse_loan(self, loan_id, approver_employee_id, reason):
        """Refuse a loan request with a given reason. Returns True."""
        loan = self.sudo().browse(loan_id)
        if not loan.exists():
            raise UserError(_('Loan not found.'))
        if loan.state not in ('draft', 'submitted'):
            raise UserError(_('Only draft or submitted loans can be refused.'))
        self._get_employee(approver_employee_id)
        loan.sudo().write({
            'state': 'refused',
            'approved_by': approver_employee_id,
            'reason_refusal': reason or '',
        })
        return True

    def _validate_loan_rules(self, employee, amount, duration_months, company_id):
        """Raise UserError if the loan request violates company rules."""
        config = self.env['hr.loan.config'].sudo().search([('company_id', '=', company_id)], limit=1)
        min_hiring_months = config.min_hiring_months if config else 6
        max_duration_months = config.max_duration_months if config else 24
        min_gap_months = config.min_gap_months if config else 3
        max_amount_percentage = config.max_amount_percentage if config else 3.0

        try:
            contract = self.env['hr.contract'].sudo().search(
                [('employee_id', '=', employee.id), ('state', 'in', ['open', 'draft'])],
                order='date_start asc', limit=1,
            )
        except KeyError:
            contract = None
        if contract and contract.date_start:
            months_employed = (date.today().year - contract.date_start.year) * 12 + \
                              (date.today().month - contract.date_start.month)
            if months_employed < min_hiring_months:
                raise UserError(
                    _('Employee must be hired for at least %d months before applying for a loan.') % min_hiring_months
                )

        if duration_months > max_duration_months:
            raise UserError(_('Loan duration cannot exceed %d months.') % max_duration_months)

        recent_loan = self.sudo().search([
            ('employee_id', '=', employee.id),
            ('state', '=', 'approved'),
        ], order='approved_date desc', limit=1)
        if recent_loan and recent_loan.approved_date:
            months_since = (date.today().year - recent_loan.approved_date.year) * 12 + \
                           (date.today().month - recent_loan.approved_date.month)
            if months_since < min_gap_months:
                raise UserError(
                    _('Employee must wait %d months between loan approvals.') % min_gap_months
                )

        basic_wage = self._get_employee_basic_wage(employee)
        max_amount = basic_wage * max_amount_percentage
        if max_amount > 0 and amount > max_amount:
            raise UserError(
                _('Loan amount cannot exceed %.2f (%.1f months salary).') % (max_amount, max_amount_percentage)
            )

    def _generate_installments(self, loan):
        """Generate monthly installment records for the loan."""
        if not loan.duration_months or loan.duration_months <= 0:
            return []
        monthly_amount = round(loan.amount / loan.duration_months, 2)
        start_date = loan.request_date or date.today()
        installments = []
        for i in range(loan.duration_months):
            due_date = start_date + relativedelta(months=i + 1)
            inst = self.env['hr.loan.installment'].sudo().create({
                'loan_id': loan.id,
                'sequence': i + 1,
                'date': due_date,
                'amount': monthly_amount,
                'paid': False,
            })
            installments.append(inst)
        return installments

    def _format_loan_record(self, loan):
        """Format an hr.loan record into a plain dict."""
        return {
            'id': loan.id,
            'name': loan.name,
            'employee_id': loan.employee_id.id,
            'employee_name': loan.employee_id.name,
            'amount': loan.amount,
            'duration_months': loan.duration_months,
            'transfer_method': loan.transfer_method,
            'state': loan.state,
            'reason_refusal': loan.reason_refusal or '',
            'approved_by': loan.approved_by.id if loan.approved_by else False,
            'approved_by_name': loan.approved_by.name if loan.approved_by else '',
            'approved_date': loan.approved_date.strftime('%Y-%m-%d') if loan.approved_date else False,
            'request_date': loan.request_date.strftime('%Y-%m-%d') if loan.request_date else False,
        }

    def _format_installment(self, inst):
        """Format an hr.loan.installment record into a plain dict."""
        return {
            'id': inst.id,
            'sequence': inst.sequence,
            'date': inst.date.strftime('%Y-%m-%d') if inst.date else False,
            'amount': inst.amount,
            'paid': inst.paid,
        }

    def _get_employee_basic_wage(self, employee):
        """Return the basic wage from the employee's active contract."""
        try:
            contract = self.env['hr.contract'].sudo().search(
                [('employee_id', '=', employee.id), ('state', 'in', ['open', 'draft'])],
                order='date_start desc', limit=1,
            )
            return contract.wage if contract else 0.0
        except KeyError:
            return 0.0
