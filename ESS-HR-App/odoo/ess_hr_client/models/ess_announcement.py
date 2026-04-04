from odoo import models, fields, api, _, SUPERUSER_ID
from odoo.exceptions import UserError


class EssAnnouncement(models.Model):
    """
    ESS Mobile Announcements — company-wide or department-targeted messages.
    Created by HR/Managers and visible to all or specific employees.
    """
    _name = 'ess.announcement'
    _description = 'ESS Mobile Announcement'
    _order = 'publish_date desc'
    _rec_name = 'title'

    title = fields.Char(string='Title', required=True)
    title_ar = fields.Char(string='Title (Arabic)')
    body = fields.Html(string='Body')
    body_ar = fields.Html(string='Body (Arabic)')
    company_id = fields.Many2one('res.company', string='Company', ondelete='cascade')
    department_id = fields.Many2one(
        'hr.department', string='Department',
        help='Leave empty to publish to all employees in the company.',
    )
    publish_date = fields.Datetime(string='Publish Date', default=fields.Datetime.now)
    expire_date = fields.Datetime(string='Expiry Date')
    is_active = fields.Boolean(string='Active', default=True)
    priority = fields.Selection(
        selection=[('low', 'Low'), ('normal', 'Normal'), ('high', 'High')],
        string='Priority',
        default='normal',
    )
    author_id = fields.Many2one('res.users', string='Author', default=lambda self: self.env.user)

    # ── API methods ───────────────────────────────────────────────────────────

    @api.model
    def get_announcements(self, employee_id, company_id=None):
        """Return active announcements visible to the employee."""
        employee = self.env['hr.employee'].with_user(SUPERUSER_ID).browse(employee_id)
        if not employee.exists():
            raise UserError(_('Employee not found.'))
        now = fields.Datetime.now()
        domain = [
            ('is_active', '=', True),
            ('publish_date', '<=', now),
            '|', ('expire_date', '=', False), ('expire_date', '>=', now),
        ]
        # Filter by company
        emp_company = employee.company_id.id if employee.company_id else company_id
        if emp_company:
            domain += ['|', ('company_id', '=', emp_company), ('company_id', '=', False)]
        # Filter by department (show global + employee's department)
        emp_dept = employee.department_id.id if employee.department_id else False
        if emp_dept:
            domain += ['|', ('department_id', '=', emp_dept), ('department_id', '=', False)]
        else:
            domain.append(('department_id', '=', False))
        announcements = self.with_user(SUPERUSER_ID).search(domain)
        return [self._format_announcement(a) for a in announcements]

    def _format_announcement(self, ann):
        # Strip HTML tags from body for plain-text summary
        import re
        body_plain = re.sub(r'<[^>]+>', '', ann.body or '') if ann.body else ''
        return {
            'id': ann.id,
            'title': ann.title,
            'title_ar': ann.title_ar or ann.title,
            'body': ann.body or '',
            'body_ar': ann.body_ar or ann.body or '',
            'body_plain': body_plain.strip(),
            'company_id': ann.company_id.id if ann.company_id else False,
            'department_id': ann.department_id.id if ann.department_id else False,
            'department_name': ann.department_id.name if ann.department_id else '',
            'publish_date': ann.publish_date.strftime('%Y-%m-%d %H:%M:%S') if ann.publish_date else False,
            'expire_date': ann.expire_date.strftime('%Y-%m-%d %H:%M:%S') if ann.expire_date else False,
            'priority': ann.priority,
            'author': ann.author_id.name if ann.author_id else '',
        }
