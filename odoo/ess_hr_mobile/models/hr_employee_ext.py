import hashlib
from odoo import models, fields, api, _
from odoo.exceptions import UserError


class HrEmployeeExt(models.Model):
    _name = 'hr.employee'
    _inherit = ['hr.employee', 'ess.mixin']

    mobile_pin = fields.Char(string='Mobile PIN (Hashed)', store=True, copy=False)

    @api.model
    def authenticate_badge_pin(self, badge_id, pin, company_id):
        """Authenticate an employee by badge ID and PIN. Returns employee dict or raises."""
        employee = self._find_employee_by_badge(badge_id, company_id)
        if not employee:
            raise UserError(_('Employee not found for badge ID: %s') % badge_id)
        if not employee.mobile_pin:
            raise UserError(_('No mobile PIN set for this employee.'))
        if not self._verify_pin(pin, employee.mobile_pin):
            raise UserError(_('Invalid PIN.'))
        return self._format_employee_profile(employee)

    @api.model
    def get_employee_by_odoo_user(self, odoo_uid):
        """Return employee dict linked to the given Odoo user ID."""
        employee = self.sudo().search([('user_id', '=', odoo_uid)], limit=1)
        if not employee:
            raise UserError(_('No employee record linked to user ID: %s') % odoo_uid)
        return self._format_employee_profile(employee)

    @api.model
    def reset_mobile_pin(self, employee_id, new_pin):
        """Set a new hashed PIN for the employee. Returns True."""
        employee = self._get_employee(employee_id)
        if not new_pin or len(str(new_pin)) < 4:
            raise UserError(_('PIN must be at least 4 characters.'))
        employee.sudo().write({'mobile_pin': self._hash_pin(str(new_pin))})
        return True

    @api.model
    def get_employee_profile(self, employee_id):
        """Return the full profile dict for the given employee."""
        employee = self._get_employee(employee_id)
        return self._format_employee_profile(employee)

    @api.model
    def get_contract_summary(self, employee_id):
        """Return the active contract summary dict for the given employee."""
        employee = self._get_employee(employee_id)
        contract = self.env['hr.contract'].sudo().search(
            [('employee_id', '=', employee_id), ('state', 'in', ['open', 'draft'])],
            order='date_start desc',
            limit=1,
        )
        if not contract:
            return {}
        return self._format_contract_summary(contract)

    def _hash_pin(self, pin):
        """Hash a PIN string using SHA-256. Returns hex digest string."""
        return hashlib.sha256(pin.encode('utf-8')).hexdigest()

    def _verify_pin(self, pin, hashed_pin):
        """Verify a plain PIN against its stored hash. Returns bool."""
        return self._hash_pin(str(pin)) == hashed_pin

    def _format_employee_profile(self, employee):
        """Format an hr.employee record into a plain dict."""
        return {
            'id': employee.id,
            'name': employee.name,
            'job_title': employee.job_title or '',
            'job_id': employee.job_id.id if employee.job_id else False,
            'job_name': employee.job_id.name if employee.job_id else '',
            'department_id': employee.department_id.id if employee.department_id else False,
            'department_name': employee.department_id.name if employee.department_id else '',
            'company_id': employee.company_id.id if employee.company_id else False,
            'company_name': employee.company_id.name if employee.company_id else '',
            'work_email': employee.work_email or '',
            'work_phone': employee.work_phone or '',
            'mobile_phone': employee.mobile_phone or '',
            'image': employee.image_128.decode('utf-8') if employee.image_128 else False,
            'badge_id': employee.barcode or '',
            'gender': employee.gender or '',
            'birthday': employee.birthday.strftime('%Y-%m-%d') if employee.birthday else False,
            'coach_id': employee.coach_id.id if employee.coach_id else False,
            'coach_name': employee.coach_id.name if employee.coach_id else '',
            'parent_id': employee.parent_id.id if employee.parent_id else False,
            'parent_name': employee.parent_id.name if employee.parent_id else '',
            'user_id': employee.user_id.id if employee.user_id else False,
        }

    def _format_contract_summary(self, contract):
        """Format an hr.contract record into a plain dict."""
        return {
            'id': contract.id,
            'name': contract.name,
            'date_start': contract.date_start.strftime('%Y-%m-%d') if contract.date_start else False,
            'date_end': contract.date_end.strftime('%Y-%m-%d') if contract.date_end else False,
            'wage': contract.wage,
            'state': contract.state,
            'job_id': contract.job_id.id if contract.job_id else False,
            'job_name': contract.job_id.name if contract.job_id else '',
            'department_id': contract.department_id.id if contract.department_id else False,
            'department_name': contract.department_id.name if contract.department_id else '',
            'currency': contract.company_id.currency_id.name if contract.company_id else '',
        }

    def _find_employee_by_badge(self, badge_id, company_id):
        """Search for an employee by badge/barcode in the given company."""
        domain = [('barcode', '=', badge_id)]
        if company_id:
            domain.append(('company_id', '=', company_id))
        return self.sudo().search(domain, limit=1)
