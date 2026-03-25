from odoo import http
from odoo.http import request

from .utils import call_and_log, get_body


class PersonalNotesController(http.Controller):

    @http.route('/ess/api/personal-notes', type='http', auth='none', methods=['GET', 'POST'], csrf=False)
    def notes(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/personal-notes', employee_id,
            lambda: [],  # stub — no personal notes model yet
        )

    @http.route('/ess/api/personal-notes/<int:note_id>', type='http', auth='none', methods=['GET', 'PATCH', 'DELETE'], csrf=False)
    def note_by_id(self, note_id):
        kw = get_body()
        employee_id = kw.get('employee_id')
        method = request.httprequest.method
        return call_and_log(
            '/ess/api/personal-notes/<id>', employee_id,
            lambda: {'id': note_id},
        )
