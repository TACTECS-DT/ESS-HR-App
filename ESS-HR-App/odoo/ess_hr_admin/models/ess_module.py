from odoo import models, fields


class EssModule(models.Model):
    """
    ESS Mobile Module catalog.

    Each record represents a feature module that can be enabled or disabled
    per license. The mobile app uses `code` to decide which screens to show.
    """
    _name = 'ess.module'
    _description = 'ESS Mobile Module'
    _rec_name = 'name'
    _order = 'sequence, name'

    name = fields.Char(string='Module Name', required=True)
    code = fields.Char(
        string='Module Code',
        required=True,
        help='Identifier used by the mobile app to enable/disable this module. '
             'e.g. attendance, leave, payslip, expense, loan, advance_salary, '
             'hr_services, tasks, analytics, notifications, announcements.',
    )
    description = fields.Text(string='Description')
    sequence = fields.Integer(string='Sequence', default=10)
    active = fields.Boolean(string='Active', default=True)

    _code_unique = models.Constraint(
        'UNIQUE(code)',
        'Module code must be unique.',
    )
