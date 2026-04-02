from odoo import http
from odoo.http import request

from .utils import call_and_log, get_body, get_auth_context


class TeamController(http.Controller):

    @http.route('/ess/api/team-hours', type='http', auth='none', methods=['GET', 'POST'], csrf=False, readonly=False)
    def team_hours(self):
        kw = get_body()
        employee_id = kw.get('employee_id') or get_auth_context().get('employee_id')
        return call_and_log(
            '/ess/api/team-hours',
            lambda: request.env['account.analytic.line'].sudo().get_team_hours(
                employee_id, kw.get('date_from'), kw.get('date_to'),
            ),
        )
