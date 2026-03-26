from odoo import http
from odoo.http import request

from .utils import call_and_log, get_body


class LicenseController(http.Controller):

    @http.route('/ess/api/auth/validate-license', type='http', auth='none', methods=['POST'], csrf=False)
    def validate(self):
        kw = get_body()
        return call_and_log(
            '/ess/api/auth/validate-license',
            lambda: request.env['ess.license'].sudo().validate_license_key(
                kw.get('license_key'), kw.get('server_url'),
            ),
        )

    @http.route('/ess/api/auth/companies', type='http', auth='none', methods=['GET', 'POST'], csrf=False)
    def companies(self):
        kw = get_body()
        return call_and_log(
            '/ess/api/auth/companies',
            lambda: request.env['ess.license'].sudo().get_companies_for_license(kw.get('license_key')),
        )
