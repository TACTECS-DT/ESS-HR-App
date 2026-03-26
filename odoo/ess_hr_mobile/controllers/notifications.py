from odoo import http
from odoo.http import request

from .utils import call_and_log, get_body


class NotificationsController(http.Controller):

    @http.route('/ess/api/notifications', type='http', auth='none', methods=['GET', 'POST'], csrf=False)
    def list(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/notifications',
            lambda: [],  # stub — no notification model yet
        )

    @http.route('/ess/api/notifications/<int:notification_id>/read', type='http', auth='none', methods=['POST'], csrf=False)
    def mark_read(self, notification_id):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/notifications/<id>/read',
            lambda: {'id': notification_id, 'read': True},
        )

    @http.route('/ess/api/notifications/read-all', type='http', auth='none', methods=['POST'], csrf=False)
    def mark_all_read(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/notifications/read-all',
            lambda: {'updated': 0},
        )
