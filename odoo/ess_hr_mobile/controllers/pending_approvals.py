from odoo import http
from odoo.http import request

from .utils import call_and_log, get_body


class PendingApprovalsController(http.Controller):

    @http.route('/ess/api/pending-approvals', type='http', auth='none', methods=['GET', 'POST'], csrf=False)
    def list(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/pending-approvals',
            lambda: [],  # stub — aggregate pending items across modules
        )

    @http.route('/ess/api/pending-approvals/<int:item_id>/action', type='http', auth='none', methods=['POST'], csrf=False)
    def action(self, item_id):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/pending-approvals/<id>/action',
            lambda: {'id': item_id, 'action': kw.get('action'), 'success': True},
        )
