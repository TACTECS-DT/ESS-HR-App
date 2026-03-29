import base64
import uuid
from odoo import models, fields, api, _
from odoo.exceptions import UserError


class EssLicense(models.Model):
    _name = 'ess.license'
    _description = 'ESS Mobile License'
    _rec_name = 'name'
    _inherit = ['ess.mixin']

    name = fields.Char(string='License Name', required=True)
    license_key = fields.Char(string='License Key', required=True, copy=False)
    server_ids = fields.Many2many(
        'ess.server',
        'ess_license_server_rel',
        'license_id',
        'server_id',
        string='Authorized Servers',
    )
    tier = fields.Selection(
        selection=[('basic', 'Basic'), ('standard', 'Standard'), ('premium', 'Premium')],
        string='Tier',
        required=True,
        default='basic',
    )
    active = fields.Boolean(string='Active', default=True)
    expiry_date = fields.Date(string='Expiry Date')

    _license_key_unique = models.Constraint(
        'UNIQUE(license_key)',
        'License key must be unique.',
    )

    @api.model
    def validate_license_key(self, key, server_url=None):
        """
        Validate a license key + server URL and return the companies on that server.

        Hierarchy: license → servers → companies.
        The server URL must be registered under the license's servers.
        Companies returned are those assigned to the matched server.
        """
        if not key:
            raise UserError(_('License key is required.'))
        if not server_url:
            raise UserError(_('Server URL is required.'))

        license_rec = self._get_valid_license(key)
        server = self._get_authorized_server(license_rec, server_url)
        return {'companies': self._format_companies(server.company_ids)}

    @api.model
    def get_companies_for_license(self, key, server_url=None):
        """Return companies for a valid license, filtered to a specific server if provided."""
        if not key:
            raise UserError(_('License key is required.'))

        license_rec = self._get_valid_license(key)

        if server_url:
            server = self._get_authorized_server(license_rec, server_url)
            companies = self._format_companies(server.company_ids)

        else:
            # All companies across all servers for this license
            all_companies = license_rec.server_ids.mapped('company_ids')
            companies = self._format_companies(all_companies)

        if not companies:
            raise UserError(_('No companies found for this license.'))
        return companies

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _get_valid_license(self, key):
        license_rec = self.sudo().search(
            [('license_key', '=', key), ('active', '=', True)],
            limit=1,
        )
        if not license_rec:
            raise UserError(_('Invalid license key.'))
        if license_rec._is_expired():
            raise UserError(_('This license has expired. Please contact your administrator.'))
        return license_rec

    def _get_authorized_server(self, license_rec, server_url):
        normalized = self._normalize_url(server_url)
        server = license_rec.server_ids.filtered(
            lambda s: s.active and self._normalize_url(s.url) == normalized
        )[:1]
        if not server:
            raise UserError(_('This server is not authorized for this license.'))
        return server

    def _normalize_url(self, url):
        """Lowercase and strip trailing slash for consistent comparison."""
        return (url or '').strip().rstrip('/').lower()

    def _generate_license_key(self):
        """Generate a random UUID-based license key string."""
        return str(uuid.uuid4()).replace('-', '').upper()

    def _is_expired(self):
        """Check if the license has passed its expiry date."""
        if not self.expiry_date:
            return False
        return fields.Date.today() > self.expiry_date

    def _format_companies(self, companies):
        seen = set()
        result = []
        for c in companies:
            if c.id not in seen:
                seen.add(c.id)
                result.append({
                    'id': c.id,
                    'name': c.name,
                    'name_ar': c.name,
                    'logo': base64.b64encode(c.logo).decode('utf-8') if c.logo else False,
                    'currency': c.currency_id.name if c.currency_id else '',
                })
        return result
