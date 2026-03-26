from odoo import http
from odoo.http import request

from .utils import call_and_log, get_body


class AnnouncementsController(http.Controller):

    @http.route('/ess/api/announcements', type='http', auth='none', methods=['GET', 'POST'], csrf=False)
    def announcements(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/announcements',
            lambda: [],  # stub — no announcement model yet
        )
