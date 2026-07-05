from odoo import models, fields


class EssServerHistory(models.Model):
    _name = 'ess.server.history'
    _description = 'ESS Server Status History'
    _order = 'date desc'
    _rec_name = 'date'

    server_id = fields.Many2one(
        'ess.server', string='Server', required=True, ondelete='cascade', index=True,
    )
    date = fields.Datetime(string='Date', required=True, default=fields.Datetime.now, readonly=True)
    old_status = fields.Selection(
        selection=[
            ('active', 'Active'),
            ('unreachable', 'Unreachable'),
            ('deactivated', 'Deactivated'),
        ],
        string='Previous Status',
        readonly=True,
    )
    new_status = fields.Selection(
        selection=[
            ('active', 'Active'),
            ('unreachable', 'Unreachable'),
            ('deactivated', 'Deactivated'),
        ],
        string='New Status',
        required=True,
        readonly=True,
    )
    reason = fields.Text(string='Reason', readonly=True)
    source = fields.Selection(
        selection=[
            ('sync', 'Automatic Sync'),
            ('manual', 'Manual'),
            ('activate', 'Activate Wizard'),
        ],
        string='Source',
        required=True,
        readonly=True,
    )


class EssLicenseHistory(models.Model):
    _name = 'ess.license.history'
    _description = 'ESS License Status History'
    _order = 'date desc'
    _rec_name = 'date'

    license_id = fields.Many2one(
        'ess.license', string='License', required=True, ondelete='cascade', index=True,
    )
    date = fields.Datetime(string='Date', required=True, default=fields.Datetime.now, readonly=True)
    old_status = fields.Selection(
        selection=[('active', 'Active'), ('inactive', 'Inactive')],
        string='Previous Status',
        readonly=True,
    )
    new_status = fields.Selection(
        selection=[('active', 'Active'), ('inactive', 'Inactive')],
        string='New Status',
        required=True,
        readonly=True,
    )
    reason = fields.Text(string='Reason', readonly=True)
    source = fields.Selection(
        selection=[
            ('sync', 'Automatic Sync'),
            ('manual', 'Manual'),
        ],
        string='Source',
        required=True,
        readonly=True,
    )
