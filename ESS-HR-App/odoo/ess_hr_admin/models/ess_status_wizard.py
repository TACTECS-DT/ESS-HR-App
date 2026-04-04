from odoo import models, fields, api, _
from odoo.exceptions import UserError


class EssServerStatusWizard(models.TransientModel):
    """
    Wizard to manually override a client server's status.

    Opened from the server form header button "Change Status".
    Writes directly via sudo() since server_status is a readonly field
    (readonly only in the UI sense — the field is set by sync jobs).
    """
    _name = 'ess.server.status.wizard'
    _description = 'Change Server Status'

    server_id = fields.Many2one('ess.server', string='Server', required=True, readonly=True)
    current_status = fields.Selection(related='server_id.server_status', string='Current Status', readonly=True)
    new_status = fields.Selection(
        selection=[
            ('active', 'Active'),
            ('unreachable', 'Unreachable'),
            ('deactivated', 'Deactivated'),
        ],
        string='New Status',
        required=True,
    )
    reason = fields.Text(
        string='Reason',
        help='Required when deactivating. Also recorded on the linked license.',
    )

    @api.constrains('new_status', 'reason')
    def _check_reason_required(self):
        for rec in self:
            if rec.new_status == 'deactivated' and not (rec.reason or '').strip():
                raise UserError(_('A reason is required when deactivating a server.'))

    def action_apply(self):
        self.ensure_one()
        server = self.server_id.sudo()
        server.write({'server_status': self.new_status})

        # When manually deactivating, also deactivate the linked license
        if self.new_status == 'deactivated':
            reason = (self.reason or '').strip() or _('Manual deactivation by administrator.')
            license_rec = server.license_id
            if license_rec and license_rec.active:
                license_rec.write({
                    'active': False,
                    'deactivation_reason': reason,
                    'deactivation_date': fields.Datetime.now(),
                })

        # When reactivating, restore the linked license if it was auto-deactivated
        elif self.new_status == 'active':
            license_rec = server.license_id
            if license_rec and not license_rec.active:
                license_rec.write({
                    'active': True,
                    'deactivation_reason': False,
                    'deactivation_date': False,
                })

        return {'type': 'ir.actions.act_window_close'}

    def action_open_for_server(self):
        """Called from the server form button — pre-fills server_id."""
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': _('Change Server Status'),
            'res_model': 'ess.server.status.wizard',
            'view_mode': 'form',
            'target': 'new',
            'context': {
                'default_server_id': self.id,
                'default_new_status': self.server_status,
            },
        }


class EssLicenseStatusWizard(models.TransientModel):
    """
    Wizard to manually activate or deactivate a license.

    Opened from the license form header button "Change Status".
    """
    _name = 'ess.license.status.wizard'
    _description = 'Change License Status'

    license_id = fields.Many2one('ess.license', string='License', required=True, readonly=True)
    current_active = fields.Boolean(related='license_id.active', string='Currently Active', readonly=True)
    action = fields.Selection(
        selection=[
            ('activate', 'Activate'),
            ('deactivate', 'Deactivate'),
        ],
        string='Action',
        required=True,
    )
    reason = fields.Text(
        string='Reason',
        help='Required when deactivating.',
    )

    @api.constrains('action', 'reason')
    def _check_reason_required(self):
        for rec in self:
            if rec.action == 'deactivate' and not (rec.reason or '').strip():
                raise UserError(_('A reason is required when deactivating a license.'))

    def action_apply(self):
        self.ensure_one()
        license_rec = self.license_id.sudo()

        if self.action == 'deactivate':
            reason = (self.reason or '').strip() or _('Manual deactivation by administrator.')
            license_rec.write({
                'active': False,
                'deactivation_reason': reason,
                'deactivation_date': fields.Datetime.now(),
            })
            # Reflect on all linked servers
            license_rec.server_ids.sudo().write({'server_status': 'deactivated'})

        elif self.action == 'activate':
            license_rec.write({
                'active': True,
                'deactivation_reason': False,
                'deactivation_date': False,
            })
            # Restore linked servers to active
            license_rec.server_ids.sudo().write({'server_status': 'active'})

        return {'type': 'ir.actions.act_window_close'}
