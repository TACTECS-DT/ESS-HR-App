from odoo import models, fields, api, _
from odoo.exceptions import UserError


class EssActivateServersWizard(models.TransientModel):
    _name = 'ess.activate.servers.wizard'
    _description = 'Activate Servers Wizard'

    license_id = fields.Many2one('ess.license', string='License', readonly=True)
    server_ids = fields.Many2many(
        'ess.server',
        string='Servers to Activate',
        domain="[('license_id', '=', license_id), ('server_status', '=', 'deactivated')]",
    )

    @api.model
    def default_get(self, fields_list):
        res = super().default_get(fields_list)
        license_id = self.env.context.get('default_license_id')
        if license_id and 'server_ids' in fields_list:
            deactivated = self.env['ess.server'].sudo().search([
                ('license_id', '=', license_id),
                ('server_status', '=', 'deactivated'),
            ])
            res['server_ids'] = [fields.Command.set(deactivated.ids)]
        return res

    def action_activate(self):
        self.ensure_one()
        if not self.server_ids:
            raise UserError(_('Please select at least one server to activate.'))
        for server in self.server_ids:
            server.sudo()._log_history(
                server.server_status, 'active',
                _('Server reactivated via Activate Wizard.'),
                source='activate',
            )
        self.server_ids.sudo().write({'server_status': 'active'})
        return {'type': 'ir.actions.act_window_close'}
