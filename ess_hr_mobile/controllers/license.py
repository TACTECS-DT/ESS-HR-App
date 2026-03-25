from odoo import http
from odoo.http import request

from .utils import call_and_log, get_body


class LicenseController(http.Controller):

    @http.route('/ess/api/license/validate', type='http', auth='none', methods=['POST'], csrf=False)
    def validate(self):
        kw = get_body()
        return call_and_log(
            '/ess/api/license/validate', None,
            lambda: request.env['ess.license'].sudo().validate_license_key(kw.get('key')),
        )

    @http.route('/ess/api/license/companies', type='http', auth='none', methods=['POST'], csrf=False)
    def companies(self):
        kw = get_body()
        return call_and_log(
            '/ess/api/license/companies', None,
            lambda: request.env['ess.license'].sudo().get_companies_for_license(kw.get('key')),
        )
