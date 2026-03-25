import base64
from odoo import models, fields, api, _
from odoo.exceptions import UserError


class HrExpenseExt(models.Model):
    _name = 'hr.expense'
    _inherit = ['hr.expense', 'ess.mixin']

    @api.model
    def get_expense_categories(self):
        """Return list of product dicts suitable as expense types."""
        products = self.env['product.product'].sudo().search([
            ('can_be_expensed', '=', True),
            ('active', '=', True),
        ])
        return [{
            'id': p.id,
            'name': p.name,
            'default_code': p.default_code or '',
            'uom_id': p.uom_id.id if p.uom_id else False,
            'uom_name': p.uom_id.name if p.uom_id else '',
            'standard_price': p.standard_price,
        } for p in products]

    @api.model
    def get_currencies(self):
        """Return list of active currency dicts."""
        currencies = self.env['res.currency'].sudo().search([('active', '=', True)])
        return [{
            'id': c.id,
            'name': c.name,
            'symbol': c.symbol,
            'rate': c.rate,
        } for c in currencies]

    @api.model
    def get_purchase_taxes(self, company_id):
        """Return list of purchase tax dicts for the given company."""
        domain = [('type_tax_use', '=', 'purchase'), ('active', '=', True)]
        if company_id:
            domain.append(('company_id', '=', company_id))
        taxes = self.env['account.tax'].sudo().search(domain)
        return [{
            'id': t.id,
            'name': t.name,
            'amount': t.amount,
            'amount_type': t.amount_type,
        } for t in taxes]

    @api.model
    def create_expense(self, employee_id, product_id, total_amount, currency_id,
                       tax_ids, payment_mode, name, date):
        """Create a new expense record and return its dict."""
        employee = self._get_employee(employee_id)
        product = self.env['product.product'].sudo().browse(product_id)
        if not product.exists():
            raise UserError(_('Expense category not found.'))
        vals = {
            'employee_id': employee_id,
            'product_id': product_id,
            'total_amount': total_amount,
            'currency_id': currency_id,
            'payment_mode': payment_mode or 'own_account',
            'name': name or product.name,
            'date': date,
        }
        if tax_ids:
            vals['tax_ids'] = [(6, 0, tax_ids)]
        expense = self._env_for_write(employee).create(vals)
        return self._format_expense_record(expense)

    @api.model
    def attach_file_to_expense(self, expense_id, filename, file_base64):
        """Attach a file to an expense and return the attachment dict."""
        expense = self.sudo().browse(expense_id)
        if not expense.exists():
            raise UserError(_('Expense not found.'))
        attachment = self.env['ir.attachment'].sudo().create({
            'name': filename,
            'datas': file_base64,
            'res_model': 'hr.expense',
            'res_id': expense_id,
            'type': 'binary',
        })
        return {
            'id': attachment.id,
            'name': attachment.name,
            'mimetype': attachment.mimetype,
            'file_size': attachment.file_size,
        }

    @api.model
    def get_expenses(self, employee_id, state_filter=None):
        """Return list of expense records for the employee, optionally filtered by state."""
        domain = [('employee_id', '=', employee_id)]
        if state_filter:
            domain.append(('state', '=', state_filter))
        expenses = self.sudo().search(domain, order='date desc')
        return [self._format_expense_record(e) for e in expenses]

    @api.model
    def update_expense(self, expense_id, vals):
        """Update an expense record with the given values and return updated dict."""
        expense = self.sudo().browse(expense_id)
        if not expense.exists():
            raise UserError(_('Expense not found.'))
        self._validate_expense_editable(expense)
        employee = expense.employee_id
        allowed_fields = ['name', 'date', 'total_amount', 'currency_id', 'payment_mode',
                          'product_id', 'quantity', 'description']
        write_vals = {k: v for k, v in vals.items() if k in allowed_fields}
        if 'tax_ids' in vals:
            write_vals['tax_ids'] = [(6, 0, vals['tax_ids'])]
        self._env_for_write(employee).browse(expense.id).write(write_vals)
        return self._format_expense_record(expense)

    @api.model
    def delete_expense(self, expense_id):
        """Delete a draft expense. Returns True."""
        expense = self.sudo().browse(expense_id)
        if not expense.exists():
            raise UserError(_('Expense not found.'))
        self._validate_expense_editable(expense)
        employee = expense.employee_id
        self._env_for_write(employee).browse(expense.id).unlink()
        return True

    @api.model
    def ess_submit_expense(self, expense_id):
        """Submit an expense by creating/adding to an expense sheet, then return sheet dict."""
        expense = self.sudo().browse(expense_id)
        if not expense.exists():
            raise UserError(_('Expense not found.'))
        self._validate_expense_editable(expense)
        employee = expense.employee_id
        sheet = self._create_expense_sheet(expense)
        self._env_for_write(employee).browse(sheet.id).action_submit_sheet()
        return {
            'id': sheet.id,
            'name': sheet.name,
            'state': sheet.state,
            'total_amount': sheet.total_amount,
            'expense_ids': sheet.expense_ids.ids,
        }

    def _validate_expense_editable(self, expense):
        """Raise UserError if the expense is not in draft state."""
        if expense.state != 'draft':
            raise UserError(_('Only draft expenses can be modified or deleted.'))

    def _format_expense_record(self, expense):
        """Format an hr.expense record into a plain dict."""
        return {
            'id': expense.id,
            'name': expense.name,
            'employee_id': expense.employee_id.id,
            'employee_name': expense.employee_id.name,
            'product_id': expense.product_id.id if expense.product_id else False,
            'product_name': expense.product_id.name if expense.product_id else '',
            'total_amount': expense.total_amount,
            'currency_id': expense.currency_id.id if expense.currency_id else False,
            'currency_name': expense.currency_id.name if expense.currency_id else '',
            'payment_mode': expense.payment_mode,
            'date': expense.date.strftime('%Y-%m-%d') if expense.date else False,
            'state': expense.state,
            'sheet_id': expense.sheet_id.id if expense.sheet_id else False,
            'tax_ids': expense.tax_ids.ids,
        }

    def _create_expense_sheet(self, expense):
        """Create a new hr.expense.sheet for the given expense and return the sheet record."""
        existing_sheet = expense.sheet_id
        if existing_sheet:
            return existing_sheet
        sheet = self.env['hr.expense.sheet'].sudo().create({
            'name': expense.name,
            'employee_id': expense.employee_id.id,
            'expense_line_ids': [(4, expense.id)],
            'company_id': expense.company_id.id if expense.company_id else False,
        })
        return sheet
