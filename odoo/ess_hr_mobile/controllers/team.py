from odoo import http
from odoo.http import request

from .utils import call_and_log, get_body


class TeamController(http.Controller):

    @http.route('/ess/api/team-hours', type='http', auth='none', methods=['GET', 'POST'], csrf=False)
    def team_hours(self):
        kw = get_body()
        employee_id = kw.get('employee_id')
        return call_and_log(
            '/ess/api/team-hours',
            lambda: [],  # stub — team hours summary for manager
        )
