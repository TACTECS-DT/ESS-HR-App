import base64
from odoo import models, fields, api, _, SUPERUSER_ID
from odoo.exceptions import UserError


class HrExpenseExt(models.Model):
    _name = 'hr.expense'
    _inherit = ['hr.expense', 'ess.mixin']

    @api.model
    def get_expense_categories(self):
        """Return list of product dicts suitable as expense types."""
        products = self.env['product.product'].with_user(SUPERUSER_ID).search([
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
        currencies = self.env['res.currency'].with_user(SUPERUSER_ID).search([('active', '=', True)])
        result = []
        for c in currencies:
            try:
                rate = c.rate
            except Exception:
                rate = 0.0
            result.append({
                'id': c.id,
                'name': c.name,
                'symbol': c.symbol,
                'rate': rate,
            })
        return result

    @api.model
    def get_purchase_taxes(self, company_id):
        """Return list of purchase tax dicts for the given company."""
        domain = [('type_tax_use', '=', 'purchase'), ('active', '=', True)]
        if company_id:
            domain.append(('company_id', '=', company_id))
        taxes = self.env['account.tax'].with_user(SUPERUSER_ID).search(domain)
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
        product = self.env['product.product'].with_user(SUPERUSER_ID).browse(product_id)
        if not product.exists():
            raise UserError(_('Expense category not found.'))
        vals = {
            'employee_id': employee_id,
            'product_id': product_id,
            # Set total_amount_currency (expense-currency amount) in vals together with
            # company_id so Odoo 19's precompute chain resolves correctly.
            'total_amount_currency': float(total_amount) if total_amount else 0.0,
            'currency_id': currency_id,
            'payment_mode': payment_mode or 'own_account',
            'name': name or product.name,
            'date': date or fields.Date.today(),
            'company_id': employee.company_id.id,
        }
        if tax_ids:
            vals['tax_ids'] = [(6, 0, tax_ids)]
        # Use with_user(SUPERUSER_ID) + explicit allowed_company_ids context so that
        # Odoo 19's precomputed fields (is_multiple_currency, company_currency_id)
        # resolve correctly for cross-currency expenses.
        expense = self.with_user(SUPERUSER_ID).with_context(
            allowed_company_ids=[employee.company_id.id]
        ).create(vals)
        return self._format_expense_record(expense)

    @api.model
    def attach_file_to_expense(self, expense_id, filename, file_base64):
        """Attach a file to an expense and return the attachment dict."""
        expense = self.with_user(SUPERUSER_ID).browse(expense_id)
        if not expense.exists():
            raise UserError(_('Expense not found.'))
        attachment = self.env['ir.attachment'].with_user(SUPERUSER_ID).create({
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
    def get_expense_detail(self, expense_id):
        """Return a single expense record dict by ID."""
        expense = self.with_user(SUPERUSER_ID).browse(expense_id)
        if not expense.exists():
            raise UserError(_('Expense not found.'))
        return self._format_expense_record(expense)

    @api.model
    def get_expenses(self, employee_id, state_filter=None):
        """Return list of expense records for the employee, optionally filtered by state."""
        domain = [('employee_id', '=', employee_id)]
        if state_filter:
            domain.append(('state', '=', state_filter))
        expenses = self.with_user(SUPERUSER_ID).search(domain, order='date desc')
        return [self._format_expense_record(e) for e in expenses]

    @api.model
    def update_expense(self, expense_id, vals):
        """Update an expense record with the given values and return updated dict."""
        expense = self.with_user(SUPERUSER_ID).browse(expense_id)
        if not expense.exists():
            raise UserError(_('Expense not found.'))
        self._validate_expense_editable(expense)
        employee = expense.employee_id
        allowed_fields = ['name', 'date', 'total_amount', 'currency_id', 'payment_mode',
                          'product_id', 'quantity', 'description']
        write_vals = {k: v for k, v in vals.items() if k in allowed_fields}
        if 'tax_ids' in vals:
            write_vals['tax_ids'] = [(6, 0, vals['tax_ids'])]
        expense.with_user(SUPERUSER_ID).write(write_vals)
        return self._format_expense_record(expense)

    @api.model
    def delete_expense(self, expense_id):
        """Delete a draft expense. Returns True."""
        expense = self.with_user(SUPERUSER_ID).browse(expense_id)
        if not expense.exists():
            raise UserError(_('Expense not found.'))
        self._validate_expense_editable(expense)
        employee = expense.employee_id
        expense.with_user(SUPERUSER_ID).unlink()
        return True

    @api.model
    def ess_submit_expense(self, expense_id):
        """Submit a draft expense for approval and return the updated expense dict.

        In Odoo 19 hr.expense.sheet was removed; submission is done directly via
        action_submit() on the hr.expense record itself.
        """
        expense = self.with_user(SUPERUSER_ID).browse(expense_id)
        if not expense.exists():
            raise UserError(_('Expense not found.'))
        self._validate_expense_editable(expense)
        employee = expense.employee_id
        expense.with_user(SUPERUSER_ID).action_submit()
        expense.env.flush_all()          # trigger deferred constraints inside try/except
        expense.invalidate_recordset()
        return self._format_expense_record(expense)

    def _validate_expense_editable(self, expense):
        """Raise UserError if the expense is not in draft state."""
        if expense.state != 'draft':
            raise UserError(_('Only draft expenses can be modified or deleted.'))

    def _format_expense_record(self, expense):
        """Format an hr.expense record into a plain dict."""
        # sheet_id was removed in Odoo 19; guard against missing field
        sheet_id = False
        if hasattr(expense, 'sheet_id') and expense.sheet_id:
            sheet_id = expense.sheet_id.id
        product_name = expense.product_id.name if expense.product_id else ''
        currency_name = expense.currency_id.name if expense.currency_id else ''
        employee_name = expense.employee_id.name if expense.employee_id else ''
        return {
            'id': expense.id,
            'name': expense.name,
            'employee_id': expense.employee_id.id,
            'employee': employee_name,
            'employee_ar': employee_name,
            'product_id': expense.product_id.id if expense.product_id else False,
            'category': product_name,
            'category_ar': product_name,
            'amount': expense.total_amount,
            'currency_id': expense.currency_id.id if expense.currency_id else False,
            'currency': currency_name,
            'tax_amount': 0.0,
            'payment_mode': expense.payment_mode,
            'date': expense.date.strftime('%Y-%m-%d') if expense.date else False,
            'status': expense.state,
            'sheet_id': sheet_id,
            'tax_ids': expense.tax_ids.ids,
            'attachments': [],
        }

