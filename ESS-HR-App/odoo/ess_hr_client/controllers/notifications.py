from odoo import http
from odoo.http import request

from .utils import call_and_log, get_body, get_auth_context


class NotificationsController(http.Controller):

    @http.route('/ess/api/notifications', type='http', auth='none', methods=['GET', 'POST'], csrf=False, readonly=False)
    def list(self):
        kw = get_body()
        employee_id = kw.get('employee_id') or get_auth_context().get('employee_id')
        return call_and_log(
            '/ess/api/notifications',
            lambda: request.env['ess.notification'].sudo().get_notifications(
                employee_id, kw.get('unread_only', False),
            ),
        )

    @http.route('/ess/api/notifications/<int:notification_id>/read', type='http', auth='none', methods=['POST'], csrf=False, readonly=False)
    def mark_read(self, notification_id):
        kw = get_body()
        employee_id = kw.get('employee_id') or get_auth_context().get('employee_id')
        return call_and_log(
            '/ess/api/notifications/<id>/read',
            lambda: request.env['ess.notification'].sudo().mark_as_read(
                notification_id, employee_id,
            ),
        )

    @http.route('/ess/api/notifications/read-all', type='http', auth='none', methods=['POST'], csrf=False, readonly=False)
    def mark_all_read(self):
        kw = get_body()
        employee_id = kw.get('employee_id') or get_auth_context().get('employee_id')
        return call_and_log(
            '/ess/api/notifications/read-all',
            lambda: request.env['ess.notification'].sudo().mark_all_as_read(employee_id),
        )
