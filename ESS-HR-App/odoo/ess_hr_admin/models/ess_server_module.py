from odoo import models, fields


class EssServerModule(models.Model):
    _name = 'ess.server.module'
    _description = 'ESS Server Installed Module'
    _rec_name = 'module_name'
    _order = 'module_name asc'

    server_id = fields.Many2one(
        'ess.server', required=True, ondelete='cascade', index=True,
    )
    module_name = fields.Char(string='Name', readonly=True)
    technical_name = fields.Char(string='Technical Name', readonly=True)
    version = fields.Char(string='Version', readonly=True)
