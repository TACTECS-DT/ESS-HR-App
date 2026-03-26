from odoo import models, fields


class EssServer(models.Model):
    _name = 'ess.server'
    _description = 'ESS Mobile Server'
    _rec_name = 'name'

    name = fields.Char(string='Server Name', required=True)
    url = fields.Char(
        string='Server URL',
        required=True,
        help='Base URL of the Odoo server (e.g. https://company.odoo.com). '
             'Trailing slashes are ignored during validation.',
    )
    company_ids = fields.Many2many(
        'res.company',
        'ess_server_company_rel',
        'server_id',
        'company_id',
        string='Companies',
    )
    active = fields.Boolean(string='Active', default=True)

    _url_unique = models.Constraint(
        'UNIQUE(url)',
        'A server URL must be unique.',
    )
