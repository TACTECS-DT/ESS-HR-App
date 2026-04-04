import hashlib
from odoo import models, fields, api, _, SUPERUSER_ID
from odoo.exceptions import UserError


class EssEmployeeCredential(models.Model):
    _name = 'ess.employee.credential'
    _description = 'ESS Employee Mobile Credentials'
    _rec_name = 'employee_id'

    employee_id = fields.Many2one(
        'hr.employee',
        string='Employee',
        required=True,
        ondelete='cascade',
    )

    # ── Company — derived from employee, stored for fast queries & unique key ─
    company_id = fields.Many2one(
        'res.company',
        string='Company',
        related='employee_id.company_id',
        store=True,
        readonly=True,
        index=True,
    )

    # ── Mobile badge — owned by this table, not hr.employee.barcode ──────────
    badge_id = fields.Char(
        string='Mobile Badge ID',
        store=True,
        index=True,
        copy=False,
        help='Badge / barcode used by the mobile app for badge+PIN login. '
             'Must be unique within a company. '
             'Independent from the HR barcode field on the employee record.',
    )

    # ── Username for username+password login ──────────────────────────────────
    username = fields.Char(
        string='Username',
        store=True,
        index=True,
        copy=False,
        help='Username for mobile app username+password login. '
             'Must be unique within a company. '
             'Falls back to work email if not set.',
    )

    # ── Hashed storage (hidden from non-system users) ─────────────────────────
    pin_hash = fields.Char(
        string='PIN Hash', copy=False, groups='base.group_system', readonly=True,
    )
    password_hash = fields.Char(
        string='Password Hash', copy=False, groups='base.group_system', readonly=True,
    )

    # ── Plain-text inputs — never stored, hashed on write/create ─────────────
    new_pin = fields.Char(
        string='Set PIN',
        store=False,
        copy=False,
        help='Enter a new PIN (min 4 digits). Will be hashed and saved automatically.',
    )
    new_password = fields.Char(
        string='Set Password',
        store=False,
        copy=False,
        help='Enter a new password (min 6 characters). Will be hashed and saved automatically.',
    )

    # ── Status indicators (computed) ──────────────────────────────────────────
    pin_is_set = fields.Boolean(
        string='PIN Set', compute='_compute_status', store=False,
    )
    password_is_set = fields.Boolean(
        string='Password Set', compute='_compute_status', store=False,
    )

    active = fields.Boolean(string='Active', default=True)
    last_reset_date = fields.Datetime(string='Last Changed', readonly=True)
    reset_by_id = fields.Many2one('res.users', string='Changed By', readonly=True)

    _employee_unique = models.Constraint(
        'UNIQUE(employee_id)',
        'Each employee can have only one credential record.',
    )
    _badge_id_company_unique = models.Constraint(
        'UNIQUE(badge_id, company_id)',
        'Mobile Badge ID must be unique within a company.',
    )
    _username_company_unique = models.Constraint(
        'UNIQUE(username, company_id)',
        'Username must be unique within a company.',
    )

    # ── Computed ──────────────────────────────────────────────────────────────

    @api.depends('pin_hash', 'password_hash')
    def _compute_status(self):
        for rec in self:
            rec.pin_is_set = bool(rec.pin_hash)
            rec.password_is_set = bool(rec.password_hash)

    # ── Write / Create intercept to hash plain-text inputs ───────────────────

    def write(self, vals):
        vals = self._process_credential_vals(vals)
        return super().write(vals)

    @api.model_create_multi
    def create(self, vals_list):
        vals_list = [self._process_credential_vals(v) for v in vals_list]
        return super().create(vals_list)

    def _process_credential_vals(self, vals):
        """Hash new_pin / new_password before they reach the DB."""
        vals = dict(vals)
        now = fields.Datetime.now()
        uid = self.env.user.id if self.env.user else False

        if vals.get('new_pin'):
            pin = vals.pop('new_pin')
            if len(str(pin)) < 4:
                raise UserError(_('PIN must be at least 4 digits.'))
            vals.update({
                'pin_hash': self._hash_value(str(pin)),
                'last_reset_date': now,
                'reset_by_id': uid,
            })
        else:
            vals.pop('new_pin', None)

        if vals.get('new_password'):
            pwd = vals.pop('new_password')
            if len(str(pwd)) < 6:
                raise UserError(_('Password must be at least 6 characters.'))
            vals.update({
                'password_hash': self._hash_value(str(pwd)),
                'last_reset_date': now,
                'reset_by_id': uid,
            })
        else:
            vals.pop('new_password', None)

        return vals

    # ── Verification ──────────────────────────────────────────────────────────

    def verify_pin(self, pin):
        if not self.pin_hash or not pin:
            return False
        return self._hash_value(str(pin)) == self.pin_hash

    def verify_password(self, password):
        if not self.password_hash or not password:
            return False
        return self._hash_value(str(password)) == self.password_hash

    # ── Reset action ──────────────────────────────────────────────────────────

    def reset_credentials(self):
        self.with_user(SUPERUSER_ID).write({
            'pin_hash': False,
            'password_hash': False,
            'last_reset_date': fields.Datetime.now(),
            'reset_by_id': self.env.user.id if self.env.user else False,
        })
        return True

    def action_reset_credentials(self):
        self.reset_credentials()
        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': _('Credentials Reset'),
                'message': _('PIN and password cleared. Employee must set new credentials.'),
                'sticky': False,
                'type': 'success',
            },
        }

    # ── Helpers ───────────────────────────────────────────────────────────────

    @api.model
    def get_or_create_for_employee(self, employee_id):
        cred = self.with_user(SUPERUSER_ID).search([('employee_id', '=', employee_id)], limit=1)
        if not cred:
            cred = self.with_user(SUPERUSER_ID).create({'employee_id': employee_id})
        return cred

    def _hash_value(self, value):
        return hashlib.sha256(value.encode('utf-8')).hexdigest()
