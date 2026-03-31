from odoo import models, fields, api, _
from odoo.exceptions import UserError


class HrAdvanceSalary(models.Model):
    _name = 'hr.advance.salary'
    _description = 'Advance Salary Request'
    _rec_name = 'name'
    _order = 'request_date desc'
    _inherit = ['ess.mixin']

    name = fields.Char(string='Reference', readonly=True, copy=False, default='New')
    employee_id = fields.Many2one('hr.employee', string='Employee', required=True, ondelete='cascade')
    company_id = fields.Many2one(
        'res.company', string='Company',
        related='employee_id.company_id', store=True,
    )
    amount = fields.Float(string='Amount Requested', digits=(16, 2), required=True)
    state = fields.Selection(
        selection=[
            ('draft', 'Draft'),
            ('submitted', 'Submitted'),
            ('approved', 'Approved'),
            ('refused', 'Refused'),
        ],
        string='Status',
        default='draft',
        required=True,
    )
    reason_refusal = fields.Text(string='Reason for Refusal')
    approved_by = fields.Many2one('hr.employee', string='Approved By')
    approved_date = fields.Date(string='Approval Date')
    request_date = fields.Date(string='Request Date', default=fields.Date.today)

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get('name', 'New') == 'New':
                vals['name'] = self.env['ir.sequence'].next_by_code('hr.advance.salary') or 'New'
        return super().create(vals_list)

    @api.model
    def get_advance_salary_cap(self, employee_id):
        """Return the advance salary cap (50% of basic wage) for the employee."""
        employee = self.env['hr.employee'].sudo().browse(employee_id)
        if not employee.exists():
            raise UserError(_('Employee not found.'))
        basic_wage = self._get_basic_wage(employee)
        cap = round(basic_wage * 0.5, 2)
        return {'cap': cap, 'basic_wage': basic_wage}

    @api.model
    def create_advance_salary(self, employee_id, amount):
        """Create a new advance salary request after validating the 50% cap. Returns advance dict."""
        employee = self._get_employee(employee_id)
        self._validate_advance_cap(employee, amount)
        advance = self.sudo().create({
            'employee_id': employee_id,
            'amount': amount,
            'state': 'submitted',
            'request_date': fields.Date.today(),
        })
        return self._format_advance_record(advance)

    @api.model
    def get_advance_salary_detail(self, advance_id):
        """Return a single advance salary request dict by ID."""
        advance = self.sudo().browse(advance_id)
        if not advance.exists():
            raise UserError(_('Advance salary request not found.'))
        return self._format_advance_record(advance)

    @api.model
    def get_advance_salaries(self, employee_id):
        """Return list of advance salary records for the employee."""
        employee = self.env['hr.employee'].sudo().browse(employee_id)
        if not employee.exists():
            raise UserError(_('Employee not found.'))
        advances = self.sudo().search([('employee_id', '=', employee_id)], order='request_date desc')
        return [self._format_advance_record(a) for a in advances]

    @api.model
    def approve_advance_salary(self, request_id, manager_employee_id):
        """Approve an advance salary request. Returns True."""
        advance = self.sudo().browse(request_id)
        if not advance.exists():
            raise UserError(_('Advance salary request not found.'))
        if advance.state not in ('draft', 'submitted'):
            raise UserError(_('Only draft or submitted requests can be approved.'))
        self._get_employee(manager_employee_id)
        advance.sudo().write({
            'state': 'approved',
            'approved_by': manager_employee_id,
            'approved_date': fields.Date.today(),
        })
        return True

    @api.model
    def refuse_advance_salary(self, request_id, manager_employee_id, reason):
        """Refuse an advance salary request with a reason. Returns True."""
        advance = self.sudo().browse(request_id)
        if not advance.exists():
            raise UserError(_('Advance salary request not found.'))
        if advance.state not in ('draft', 'submitted'):
            raise UserError(_('Only draft or submitted requests can be refused.'))
        self._get_employee(manager_employee_id)
        advance.sudo().write({
            'state': 'refused',
            'approved_by': manager_employee_id,
            'reason_refusal': reason or '',
        })
        return True

    @api.model
    def reset_advance_salary(self, request_id):
        """Reset an advance salary request to draft. Returns True."""
        advance = self.sudo().browse(request_id)
        if not advance.exists():
            raise UserError(_('Advance salary request not found.'))
        if advance.state == 'approved':
            raise UserError(_('Approved requests cannot be reset to draft.'))
        advance.sudo().write({'state': 'draft', 'reason_refusal': False})
        return True

    def _validate_advance_cap(self, employee, amount):
        """Raise UserError if the requested amount exceeds 50% of basic wage."""
        basic_wage = self._get_basic_wage(employee)
        cap = basic_wage * 0.5
        if basic_wage <= 0:
            raise UserError(_('No active contract found for this employee.'))
        if amount > cap:
            raise UserError(
                _('Advance salary cannot exceed 50%% of basic wage (%.2f). Requested: %.2f') % (cap, amount)
            )

    def _get_basic_wage(self, employee):
        """Return the basic wage from the employee's active contract."""
        try:
            contract = self.env['hr.contract'].sudo().search(
                [('employee_id', '=', employee.id), ('state', 'in', ['open', 'draft'])],
                order='date_start desc', limit=1,
            )
            return contract.wage if contract else 0.0
        except KeyError:
            return 0.0

    def _format_advance_record(self, advance):
        """Format an hr.advance.salary record into a plain dict."""
        return {
            'id': advance.id,
            'name': advance.name,
            'employee_id': advance.employee_id.id,
            'employee_name': advance.employee_id.name,
            'amount': advance.amount,
            'state': advance.state,
            'reason_refusal': advance.reason_refusal or '',
            'approved_by': advance.approved_by.id if advance.approved_by else False,
            'approved_by_name': advance.approved_by.name if advance.approved_by else '',
            'approved_date': advance.approved_date.strftime('%Y-%m-%d') if advance.approved_date else False,
            'request_date': advance.request_date.strftime('%Y-%m-%d') if advance.request_date else False,
        }
