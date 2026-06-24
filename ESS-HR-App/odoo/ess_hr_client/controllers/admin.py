from odoo import http
from odoo.http import request

from .utils import call_and_log


class AdminController(http.Controller):

    @http.route('/ess/api/admin/force-logout', type='http', auth='none',
                methods=['POST'], csrf=False, readonly=False)
    def force_logout(self):
        def _do():
            param = request.env['ir.config_parameter'].sudo()
            current = int(param.get_param('ess.force_logout.generation', '0') or '0')
            new_gen = current + 1
            param.set_param('ess.force_logout.generation', str(new_gen))
            return {'generation': new_gen}
        return call_and_log('/ess/api/admin/force-logout', _do)
