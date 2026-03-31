from odoo import models, fields, api, _
from odoo.exceptions import UserError


class EssPersonalNote(models.Model):
    """
    ESS Mobile Personal Notes — private notes per employee, visible only to them.
    """
    _name = 'ess.personal.note'
    _description = 'ESS Personal Note'
    _order = 'write_date desc'
    _rec_name = 'title'

    employee_id = fields.Many2one(
        'hr.employee', string='Employee', required=True, ondelete='cascade', index=True,
    )
    title = fields.Char(string='Title', required=True)
    body = fields.Text(string='Body')
    color = fields.Integer(string='Color Index', default=0)

    # ── API methods ───────────────────────────────────────────────────────────

    @api.model
    def get_notes(self, employee_id):
        """Return all personal notes for the employee."""
        employee = self.env['hr.employee'].sudo().browse(employee_id)
        if not employee.exists():
            raise UserError(_('Employee not found.'))
        notes = self.sudo().search([('employee_id', '=', employee_id)])
        return [self._format_note(n) for n in notes]

    @api.model
    def create_note(self, employee_id, title, body='', color=0):
        """Create a new personal note. Returns note dict."""
        employee = self.env['hr.employee'].sudo().browse(employee_id)
        if not employee.exists():
            raise UserError(_('Employee not found.'))
        note = self.sudo().create({
            'employee_id': employee_id,
            'title': title,
            'body': body or '',
            'color': color or 0,
        })
        return self._format_note(note)

    @api.model
    def get_note_detail(self, note_id, employee_id):
        """Return a single note dict."""
        note = self.sudo().browse(note_id)
        if not note.exists():
            raise UserError(_('Note not found.'))
        if note.employee_id.id != employee_id:
            raise UserError(_('Access denied.'))
        return self._format_note(note)

    @api.model
    def update_note(self, note_id, employee_id, vals):
        """Update a personal note. Returns updated dict."""
        note = self.sudo().browse(note_id)
        if not note.exists():
            raise UserError(_('Note not found.'))
        if note.employee_id.id != employee_id:
            raise UserError(_('Access denied.'))
        allowed = ['title', 'body', 'color']
        write_vals = {k: v for k, v in vals.items() if k in allowed}
        note.sudo().write(write_vals)
        return self._format_note(note)

    @api.model
    def delete_note(self, note_id, employee_id):
        """Delete a personal note. Returns True."""
        note = self.sudo().browse(note_id)
        if not note.exists():
            raise UserError(_('Note not found.'))
        if note.employee_id.id != employee_id:
            raise UserError(_('Access denied.'))
        note.sudo().unlink()
        return True

    def _format_note(self, note):
        return {
            'id': note.id,
            'employee_id': note.employee_id.id,
            'title': note.title,
            'body': note.body or '',
            'color': note.color,
            'create_date': note.create_date.strftime('%Y-%m-%d %H:%M:%S') if note.create_date else False,
            'write_date': note.write_date.strftime('%Y-%m-%d %H:%M:%S') if note.write_date else False,
        }
