from odoo import http
from odoo.http import request

from .utils import call_and_log, get_body, get_auth_context


class AnnouncementsController(http.Controller):

    @http.route('/ess/api/announcements', type='http', auth='none', methods=['GET', 'POST'], csrf=False, readonly=False)
    def announcements(self):
        kw = get_body()
        ctx = get_auth_context()
        employee_id = kw.get('employee_id') or ctx.get('employee_id')
        company_id = kw.get('company_id') or ctx.get('company_id')
        return call_and_log(
            '/ess/api/announcements',
            lambda: request.env['ess.announcement'].sudo().get_announcements(
                employee_id, company_id,
            ),
        )
