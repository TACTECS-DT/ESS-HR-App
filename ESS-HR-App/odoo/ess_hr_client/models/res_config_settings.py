from odoo import models, fields


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    ess_admin_connection_key = fields.Char(
        string='Admin Connection Key',
        config_parameter='ess.admin.api.key',
        help='Secret key shared with the ESS Admin server (X-ESS-Admin-Key header). '
             'Must match the Connection Key on the server record in ESS Admin → Client Servers.',
    )

    # Stored in ir.config_parameter but intentionally NOT shown in the settings view.
    # Incremented by the admin server via POST /ess/api/admin/force-logout.
    # Mobile devices whose stored generation differs from this value are force-logged out.
    ess_force_logout_generation = fields.Char(
        string='Force Logout Generation',
        config_parameter='ess.force_logout.generation',
    )
