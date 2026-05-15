from odoo import models, fields


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    ess_admin_connection_key = fields.Char(
        string='Admin Connection Key',
        config_parameter='ess.admin.api.key',
        help='Secret key shared with the ESS Admin server (X-ESS-Admin-Key header). '
             'Must match the Connection Key on the server record in ESS Admin → Client Servers.',
    )
