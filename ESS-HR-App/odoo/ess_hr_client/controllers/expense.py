from odoo import http
from odoo.http import request
from odoo.exceptions import UserError

from .utils import call_and_log, get_body, get_auth_context, check_record_access


class ExpenseController(http.Controller):

    @http.route('/ess/api/expenses/categories', type='http', auth='none', methods=['GET', 'POST'], csrf=False, readonly=False)
    def categories(self):
        return call_and_log(
            '/ess/api/expenses/categories',
            lambda: request.env['hr.expense'].sudo().get_expense_categories(),
        )

    @http.route('/ess/api/expenses/currencies', type='http', auth='none', methods=['GET', 'POST'], csrf=False, readonly=False)
    def currencies(self):
        return call_and_log(
            '/ess/api/expenses/currencies',
            lambda: request.env['hr.expense'].sudo().get_currencies(),
        )

    @http.route('/ess/api/expenses/taxes', type='http', auth='none', methods=['GET', 'POST'], csrf=False, readonly=False)
    def taxes(self):
        kw = get_body()
        ctx = get_auth_context()
        company_id = kw.get('company_id') or ctx.get('company_id')
        return call_and_log(
            '/ess/api/expenses/taxes',
            lambda: request.env['hr.expense'].sudo().get_purchase_taxes(company_id),
        )

    @http.route('/ess/api/expenses', type='http', auth='none', methods=['GET', 'POST'], csrf=False, readonly=False)
    def expenses(self):
        kw = get_body()
        employee_id = get_auth_context().get('employee_id')
        if request.httprequest.method == 'GET':
            return call_and_log(
                '/ess/api/expenses',
                lambda: request.env['hr.expense'].sudo().get_expenses(employee_id, kw.get('state_filter')),
            )
        return call_and_log(
            '/ess/api/expenses',
            lambda: request.env['hr.expense'].sudo().create_expense(
                employee_id,
                kw.get('product_id'),
                kw.get('total_amount'),
                kw.get('currency_id'),
                kw.get('tax_ids', []),
                kw.get('payment_mode', 'own_account'),
                kw.get('name', ''),
                kw.get('date'),
            ),
        )

    @http.route('/ess/api/expenses/<int:expense_id>', type='http', auth='none', methods=['GET', 'PATCH', 'DELETE'], csrf=False, readonly=False)
    def expense_by_id(self, expense_id):
        kw = get_body()
        acting_employee_id = get_auth_context().get('employee_id')
        method = request.httprequest.method

        if method == 'GET':
            def _get():
                record = request.env['hr.expense'].sudo().browse(expense_id)
                if not record.exists():
                    raise UserError('Expense not found.')
                check_record_access(request.env, acting_employee_id, record.employee_id.id)
                return request.env['hr.expense'].sudo().get_expense_detail(expense_id)
            return call_and_log('/ess/api/expenses/<id>', _get)

        if method == 'PATCH':
            def _patch():
                record = request.env['hr.expense'].sudo().browse(expense_id)
                if not record.exists():
                    raise UserError('Expense not found.')
                check_record_access(request.env, acting_employee_id, record.employee_id.id, write=True)
                return request.env['hr.expense'].sudo().update_expense(expense_id, kw.get('vals', {}))
            return call_and_log('/ess/api/expenses/<id>', _patch)

        def _delete():
            record = request.env['hr.expense'].sudo().browse(expense_id)
            if not record.exists():
                raise UserError('Expense not found.')
            check_record_access(request.env, acting_employee_id, record.employee_id.id, write=True)
            return request.env['hr.expense'].sudo().delete_expense(expense_id)
        return call_and_log('/ess/api/expenses/<id>', _delete)

    @http.route('/ess/api/expenses/attach', type='http', auth='none', methods=['POST'], csrf=False, readonly=False)
    def attach(self):
        kw = get_body()
        acting_employee_id = get_auth_context().get('employee_id')
        def _do():
            expense_id = kw.get('expense_id')
            record = request.env['hr.expense'].sudo().browse(expense_id)
            if not record.exists():
                raise UserError('Expense not found.')
            check_record_access(request.env, acting_employee_id, record.employee_id.id, write=True)
            return request.env['hr.expense'].sudo().attach_file_to_expense(
                expense_id, kw.get('filename'), kw.get('file_base64'),
            )
        return call_and_log('/ess/api/expenses/attach', _do)

    @http.route('/ess/api/expenses/submit', type='http', auth='none', methods=['POST'], csrf=False, readonly=False)
    def submit(self):
        kw = get_body()
        acting_employee_id = get_auth_context().get('employee_id')
        def _do():
            expense_id = kw.get('expense_id')
            record = request.env['hr.expense'].sudo().browse(expense_id)
            if not record.exists():
                raise UserError('Expense not found.')
            check_record_access(request.env, acting_employee_id, record.employee_id.id, write=True)
            return request.env['hr.expense'].sudo().ess_submit_expense(expense_id)
        return call_and_log('/ess/api/expenses/submit', _do)
