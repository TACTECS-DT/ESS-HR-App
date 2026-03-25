from odoo import http
from odoo.http import request

from .utils import call_and_log, get_body


class ExpenseController(http.Controller):

    @http.route('/ess/api/expense/categories', type='http', auth='none', methods=['POST'], csrf=False)
    def categories(self):
        kw = get_body()
        return call_and_log(
            '/ess/api/expense/categories', None,
            lambda: request.env['hr.expense'].sudo().get_expense_categories(),
        )

    @http.route('/ess/api/expense/currencies', type='http', auth='none', methods=['POST'], csrf=False)
    def currencies(self):
        kw = get_body()
        return call_and_log(
            '/ess/api/expense/currencies', None,
            lambda: request.env['hr.expense'].sudo().get_currencies(),
        )

    @http.route('/ess/api/expense/taxes', type='http', auth='none', methods=['POST'], csrf=False)
    def taxes(self):
        kw = get_body()
        return call_and_log(
            '/ess/api/expense/taxes', None,
            lambda: request.env['hr.expense'].sudo().get_purchase_taxes(kw.get('company_id')),
        )

    @http.route('/ess/api/expense/create', type='http', auth='none', methods=['POST'], csrf=False)
    def create(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/expense/create', employee_id,
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

    @http.route('/ess/api/expense/attach', type='http', auth='none', methods=['POST'], csrf=False)
    def attach(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/expense/attach', employee_id,
            lambda: request.env['hr.expense'].sudo().attach_file_to_expense(
                kw.get('expense_id'), kw.get('filename'), kw.get('file_base64'),
            ),
        )

    @http.route('/ess/api/expense/list', type='http', auth='none', methods=['POST'], csrf=False)
    def list(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/expense/list', employee_id,
            lambda: request.env['hr.expense'].sudo().get_expenses(employee_id, kw.get('state_filter')),
        )

    @http.route('/ess/api/expense/update', type='http', auth='none', methods=['POST'], csrf=False)
    def update(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/expense/update', employee_id,
            lambda: request.env['hr.expense'].sudo().update_expense(
                kw.get('expense_id'), kw.get('vals', {}),
            ),
        )

    @http.route('/ess/api/expense/delete', type='http', auth='none', methods=['POST'], csrf=False)
    def delete(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/expense/delete', employee_id,
            lambda: request.env['hr.expense'].sudo().delete_expense(kw.get('expense_id')),
        )

    @http.route('/ess/api/expense/submit', type='http', auth='none', methods=['POST'], csrf=False)
    def submit(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/expense/submit', employee_id,
            lambda: request.env['hr.expense'].sudo().ess_submit_expense(kw.get('expense_id')),
        )
