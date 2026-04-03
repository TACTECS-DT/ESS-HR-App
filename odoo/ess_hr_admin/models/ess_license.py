import uuid
from odoo import models, fields, api, _
from odoo.exceptions import UserError
from odoo.addons.ess_hr_admin.exceptions import EssLicenseError


class EssLicense(models.Model):
    """
    ESS License — one license per client organisation.

    Controls:
      - Which client servers are authorized
      - Which mobile modules are allowed
      - Employee count limits (enforced by ess.server sync)
      - Auto logout duration sent to the mobile app at login Step 1
    """
    _name = 'ess.license'
    _description = 'ESS Mobile License'
    _rec_name = 'name'
    _inherit = ['mail.thread', 'mail.activity.mixin']

    name = fields.Char(string='License Name', required=True, tracking=True)
    license_key = fields.Char(string='License Key', required=True, copy=False, tracking=True)
    tier = fields.Selection(
        selection=[('basic', 'Basic'), ('standard', 'Standard'), ('premium', 'Premium')],
        string='Tier',
        required=True,
        default='basic',
        tracking=True,
    )
    active = fields.Boolean(string='Active', default=True, tracking=True)
    expiry_date = fields.Date(string='Expiry Date', tracking=True)

    # ── Authorized servers ────────────────────────────────────────────────────
    server_ids = fields.One2many(
        'ess.server',
        'license_id',
        string='Authorized Servers',
    )

    # ── Employee limits ───────────────────────────────────────────────────────
    max_employees = fields.Integer(
        string='Max Employees',
        default=50,
        tracking=True,
        help='Maximum number of active employees allowed across servers under this license.',
    )
    employee_overage_allowed = fields.Integer(
        string='Overage Employees Allowed',
        default=5,
        tracking=True,
        help='How many employees above Max Employees are tolerated before the license is '
             'automatically deactivated. For example, if Max=50 and Overage=5, deactivation '
             'triggers when employee count exceeds 55.',
    )

    # ── Allowed modules ───────────────────────────────────────────────────────
    module_ids = fields.Many2many(
        'ess.module',
        'ess_license_module_rel',
        'license_id',
        'module_id',
        string='Allowed Modules',
        tracking=True,
        help='Modules the mobile app will show for this license. '
             'If empty, all active modules are allowed.',
    )

    # ── Deactivation tracking ─────────────────────────────────────────────────
    deactivation_reason = fields.Text(string='Deactivation Reason', readonly=True, tracking=True)
    deactivation_date = fields.Datetime(string='Deactivated On', readonly=True, tracking=True)

    # ── Computed display status (for statusbar widget in form header) ──────────
    license_status = fields.Selection(
        selection=[('active', 'Active'), ('inactive', 'Inactive')],
        string='Status',
        compute='_compute_license_status',
        store=False,
    )

    @api.depends('active')
    def _compute_license_status(self):
        for rec in self:
            rec.license_status = 'active' if rec.active else 'inactive'

    _license_key_unique = models.Constraint(
        'UNIQUE(license_key)',
        'License key must be unique.',
    )

    # ── Status wizard ─────────────────────────────────────────────────────────

    def action_open_status_wizard(self):
        """Open the Change Status wizard pre-filled with this license."""
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': _('Change License Status'),
            'res_model': 'ess.license.status.wizard',
            'view_mode': 'form',
            'target': 'new',
            'context': {
                'default_license_id': self.id,
                'default_action': 'activate' if not self.active else 'deactivate',
            },
        }

    # ── Validation (called by admin API controller on Step 1) ─────────────────

    @api.model
    def validate_for_mobile(self, server_url):
        """
        Validate a client server URL and return config for the mobile app.

        Called by the mobile app at login Step 1.

        Returns:
          {
            status: 'valid' | 'invalid',
            reason: str,                  # present when invalid
            allowed_modules: [{name, code}, ...],
            auto_logout_duration: int,    # hours
          }
        """
        if not server_url:
            raise UserError(_('Server URL is required.'))

        normalized = self._normalize_url(server_url)
        server = self.env['ess.server'].sudo().search([('active', '=', True)]).filtered(
            lambda s: self._normalize_url(s.url) == normalized
        )[:1]

        if not server:
            raise EssLicenseError(
                _('Server URL not registered. Contact your administrator.'),
                'SERVER_NOT_FOUND',
            )

        license_rec = server.license_id
        if not license_rec:
            raise EssLicenseError(
                _('This server has no license assigned. Contact your administrator.'),
                'LICENSE_INACTIVE',
            )
        if not license_rec.active:
            reason = license_rec.deactivation_reason or _('License is inactive.')
            raise EssLicenseError(reason, 'LICENSE_INACTIVE')
        if license_rec._is_expired():
            raise EssLicenseError(
                _('The license for this server has expired. Contact your administrator.'),
                'LICENSE_EXPIRED',
            )

        # Employee limit check — uses the last synced count.
        # A count of 0 means no sync has happened yet; skip the check in that case.
        if server.employee_count > 0:
            limit = license_rec.max_employees + license_rec.employee_overage_allowed
            if server.employee_count > limit:
                raise EssLicenseError(
                    _(
                        'Employee limit exceeded (%d employees, limit %d). '
                        'Contact your administrator.'
                    ) % (server.employee_count, limit),
                    'EMPLOYEE_LIMIT',
                )

        # Allowed modules — empty module_ids means all active modules are permitted.
        if license_rec.module_ids:
            allowed_modules = [
                {'name': m.name, 'code': m.code}
                for m in license_rec.module_ids
                if m.active
            ]
        else:
            allowed_modules = [
                {'name': m.name, 'code': m.code}
                for m in self.env['ess.module'].sudo().search(
                    [('active', '=', True)], order='sequence'
                )
            ]

        return {
            'status': 'valid',
            'allowed_modules': allowed_modules,
            'auto_logout_duration': server.auto_logout_duration,
        }

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _is_expired(self):
        if not self.expiry_date:
            return False
        return fields.Date.today() > self.expiry_date

    @api.model
    def _normalize_url(self, url):
        return (url or '').strip().rstrip('/').lower()

    @api.model
    def _generate_license_key(self):
        return str(uuid.uuid4()).replace('-', '').upper()
