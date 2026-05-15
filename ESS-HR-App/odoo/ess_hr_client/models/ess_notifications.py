from odoo import models, fields, api, _, SUPERUSER_ID
from odoo.exceptions import UserError


class EssNotification(models.Model):
    """
    ESS Mobile Notifications — a lightweight inbox per employee.

    Notifications are created automatically when HR actions occur
    (leave approved/refused, payslip posted, etc.) or manually by HR.
    """
    _name = 'ess.notification'
    _description = 'ESS Mobile Notification'
    _order = 'create_date desc'
    _rec_name = 'title'

    employee_id = fields.Many2one(
        'hr.employee', string='Employee', required=True, ondelete='cascade', index=True,
    )
    title = fields.Char(string='Title', required=True)
    body = fields.Text(string='Body')
    type = fields.Selection(
        selection=[
            ('leave', 'Leave'),
            ('payslip', 'Payslip'),
            ('expense', 'Expense'),
            ('loan', 'Loan'),
            ('advance_salary', 'Advance Salary'),
            ('hr_letter', 'HR Letter'),
            ('document', 'Document'),
            ('announcement', 'Announcement'),
            ('general', 'General'),
        ],
        string='Type',
        default='general',
    )
    is_read = fields.Boolean(string='Read', default=False, index=True)
    read_date = fields.Datetime(string='Read At')
    related_model = fields.Char(string='Related Model')
    related_id = fields.Integer(string='Related Record ID')

    # ── API methods ───────────────────────────────────────────────────────────

    @api.model
    def get_notifications(self, employee_id, unread_only=False):
        """Return notification list for the employee."""
        employee = self.env['hr.employee'].with_user(SUPERUSER_ID).browse(employee_id)
        if not employee.exists():
            raise UserError(_('Employee not found.'))
        domain = [('employee_id', '=', employee_id)]
        if unread_only:
            domain.append(('is_read', '=', False))
        notifications = self.with_user(SUPERUSER_ID).search(domain, limit=100)
        return [self._format_notification(n) for n in notifications]

    @api.model
    def mark_as_read(self, notification_id, employee_id):
        """Mark a single notification as read. Returns updated dict."""
        notif = self.with_user(SUPERUSER_ID).browse(notification_id)
        if not notif.exists():
            raise UserError(_('Notification not found.'))
        notif.with_user(SUPERUSER_ID).write({'is_read': True, 'read_date': fields.Datetime.now()})
        return self._format_notification(notif)

    @api.model
    def mark_all_as_read(self, employee_id):
        """Mark all unread notifications for the employee as read. Returns count."""
        domain = [('employee_id', '=', employee_id), ('is_read', '=', False)]
        unread = self.with_user(SUPERUSER_ID).search(domain)
        count = len(unread)
        unread.with_user(SUPERUSER_ID).write({'is_read': True, 'read_date': fields.Datetime.now()})
        return {'updated': count}

    def _format_notification(self, notif):
        return {
            'id': notif.id,
            'employee_id': notif.employee_id.id,
            'title': notif.title,
            'body': notif.body or '',
            'type': notif.type,
            'is_read': notif.is_read,
            'read_date': notif.read_date.strftime('%Y-%m-%d %H:%M:%S') if notif.read_date else False,
            'related_model': notif.related_model or '',
            'related_id': notif.related_id or False,
            'create_date': notif.create_date.strftime('%Y-%m-%d %H:%M:%S') if notif.create_date else False,
        }
