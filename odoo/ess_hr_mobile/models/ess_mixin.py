from odoo import models, api, _
from odoo.exceptions import UserError


class EssMixin(models.AbstractModel):
    """
    Shared helpers injected into every ESS model via _inherit.

    Design principle:
      - The mobile app identifies the actor by employee_id + company_id only.
      - No Odoo user credentials come from the mobile app.
      - Odoo derives the acting user from employee.user_id for all write
        operations so that internal workflows, audit trail, and notifications
        work correctly under the right user context.
      - Multiple employees may share one Odoo user (to reduce license cost).
        Access control is enforced at the employee level, not the user level.
    """
    _name = 'ess.mixin'
    _description = 'ESS Employee Context Mixin'

    def _get_employee(self, employee_id):
        """
        Fetch and validate an employee record by ID.
        Raises UserError if the employee does not exist.
        """
        employee = self.env['hr.employee'].sudo().browse(employee_id)
        if not employee.exists():
            raise UserError(_('Employee not found (id=%s).') % employee_id)
        return employee

    def _env_for_write(self, employee):
        """
        Return this model's recordset scoped to the employee's linked Odoo user.

        - If the employee has a user_id, operations run as that user so Odoo
          workflows, notifications, and audit fields (create_uid, write_uid)
          are attributed to the correct internal user.
        - If no user_id is linked, fall back to sudo() so the operation still
          succeeds without blocking the employee's action.
        """
        if employee and employee.user_id:
            return self.with_user(employee.user_id)
        return self.sudo()
