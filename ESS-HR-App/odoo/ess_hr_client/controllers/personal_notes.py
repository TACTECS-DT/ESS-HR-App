from odoo import http
from odoo.http import request

from .utils import call_and_log, get_body, get_auth_context


class PersonalNotesController(http.Controller):

    @http.route('/ess/api/personal-notes', type='http', auth='none', methods=['GET', 'POST'], csrf=False, readonly=False)
    def notes(self):
        kw = get_body()
        employee_id = kw.get('employee_id') or get_auth_context().get('employee_id')
        if request.httprequest.method == 'GET':
            return call_and_log(
                '/ess/api/personal-notes',
                lambda: request.env['ess.personal.note'].sudo().get_notes(employee_id),
            )
        return call_and_log(
            '/ess/api/personal-notes',
            lambda: request.env['ess.personal.note'].sudo().create_note(
                employee_id,
                kw.get('title', ''),
                kw.get('body', ''),
                kw.get('color', 0),
            ),
        )

    @http.route('/ess/api/personal-notes/<int:note_id>', type='http', auth='none', methods=['GET', 'PATCH', 'DELETE'], csrf=False, readonly=False)
    def note_by_id(self, note_id):
        kw = get_body()
        employee_id = kw.get('employee_id') or get_auth_context().get('employee_id')
        method = request.httprequest.method
        if method == 'GET':
            return call_and_log(
                '/ess/api/personal-notes/<id>',
                lambda: request.env['ess.personal.note'].sudo().get_note_detail(note_id, employee_id),
            )
        if method == 'PATCH':
            return call_and_log(
                '/ess/api/personal-notes/<id>',
                lambda: request.env['ess.personal.note'].sudo().update_note(
                    note_id, employee_id, kw.get('vals', {}),
                ),
            )
        return call_and_log(
            '/ess/api/personal-notes/<id>',
            lambda: request.env['ess.personal.note'].sudo().delete_note(note_id, employee_id),
        )
