import uuid
from odoo import models, fields, api, _
from odoo.exceptions import UserError


class EssLicense(models.Model):
    _name = 'ess.license'
    _description = 'ESS Mobile License'
    _rec_name = 'name'
    _inherit = ['ess.mixin']

    name = fields.Char(string='License Name', required=True)
    company_id = fields.Many2one('res.company', string='Company', required=True, ondelete='cascade')
    license_key = fields.Char(string='License Key', required=True, copy=False)
    tier = fields.Selection(
        selection=[('basic', 'Basic'), ('standard', 'Standard'), ('premium', 'Premium')],
        string='Tier',
        required=True,
        default='basic',
    )
    active = fields.Boolean(string='Active', default=True)
    expiry_date = fields.Date(string='Expiry Date')

    _sql_constraints = [
        ('license_key_unique', 'UNIQUE(license_key)', 'License key must be unique.'),
    ]

    @api.model
    def validate_license_key(self, key):
        """Validate a license key and return company info or raise UserError."""
        if not key:
            raise UserError(_('License key is required.'))
        license_rec = self.sudo().search([('license_key', '=', key), ('active', '=', True)], limit=1)
        if not license_rec:
            raise UserError(_('Invalid or inactive license key.'))
        if license_rec._is_expired():
            raise UserError(_('This license has expired.'))
        return self._format_license_info(license_rec)

    @api.model
    def get_companies_for_license(self, key):
        """Return list of company dicts associated with a license key."""
        if not key:
            raise UserError(_('License key is required.'))
        license_recs = self.sudo().search([('license_key', '=', key), ('active', '=', True)])
        if not license_recs:
            raise UserError(_('No active license found for this key.'))
        result = []
        for lic in license_recs:
            if not lic._is_expired():
                company = lic.company_id
                result.append({
                    'id': company.id,
                    'name': company.name,
                    'currency': company.currency_id.name if company.currency_id else '',
                    'logo': company.logo.decode('utf-8') if company.logo else False,
                })
        return result

    def _generate_license_key(self):
        """Generate a random UUID-based license key string."""
        return str(uuid.uuid4()).replace('-', '').upper()

    def _is_expired(self):
        """Check if the license has passed its expiry date."""
        if not self.expiry_date:
            return False
        return fields.Date.today() > self.expiry_date

    def _format_license_info(self, license_rec):
        """Format a license record into a plain dict."""
        company = license_rec.company_id
        return {
            'id': license_rec.id,
            'name': license_rec.name,
            'tier': license_rec.tier,
            'active': license_rec.active,
            'expiry_date': license_rec.expiry_date.strftime('%Y-%m-%d') if license_rec.expiry_date else False,
            'company': {
                'id': company.id,
                'name': company.name,
                'currency': company.currency_id.name if company.currency_id else '',
            },
        }
