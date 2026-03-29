import base64
import hashlib
import secrets
from odoo import models, fields, api, _
from odoo.exceptions import UserError


class HrEmployeeExt(models.Model):
    _name = 'hr.employee'
    _inherit = ['hr.employee', 'ess.mixin']

    # Legacy field kept for backward compatibility — new auth uses ess.employee.credential
    mobile_pin = fields.Char(string='Mobile PIN (Hashed)', store=True, copy=False)

    # ─── Authentication ────────────────────────────────────────────────────────

    @api.model
    def authenticate_username_password(self, username, password, company_id):
        """
        Authenticate by username (mobile badge_id from credential table, or work_email)
        and password. Returns {user, tokens} — never exposes Odoo user_id.
        """
        if not username or not password:
            raise UserError(_('Username and password are required.'))

        employee, credential = self._resolve_username(username, company_id)
        if not credential or not credential.password_hash:
            raise UserError(_('No password set for this employee. Contact HR.'))
        if not credential.verify_password(password):
            raise UserError(_('Invalid password.'))

        return {
            'user': self._format_employee_profile(employee),
            'tokens': self._generate_tokens(employee.id),
        }

    @api.model
    def authenticate_badge_pin(self, badge_id, pin, company_id):
        """
        Authenticate an employee by badge ID and PIN.

        Looks up credentials in ess.employee.credential first; falls back to
        the legacy mobile_pin field on hr.employee for existing records.

        Returns {user: {...}, tokens: {...}} — never exposes Odoo user_id.
        """
        employee = self._find_employee_by_badge(badge_id, company_id)
        if not employee:
            raise UserError(_('Employee not found for badge ID: %s') % badge_id)

        # Check new credential table first
        credential = self.env['ess.employee.credential'].sudo().search(
            [('employee_id', '=', employee.id), ('active', '=', True)],
            limit=1,
        )
        if credential and credential.pin_hash:
            if not credential.verify_pin(pin):
                raise UserError(_('Invalid PIN.'))
        elif employee.mobile_pin:
            # Fallback: legacy mobile_pin on hr.employee
            if not self._verify_pin(pin, employee.mobile_pin):
                raise UserError(_('Invalid PIN.'))
        else:
            raise UserError(_('No mobile PIN set for this employee. Contact HR.'))

        return {
            'user': self._format_employee_profile(employee),
            'tokens': self._generate_tokens(employee.id),
        }

    @api.model
    def get_employee_by_user(self, user_id):
        """Resolve an Odoo user ID to the matching employee profile."""
        if not user_id:
            raise UserError(_('user_id is required.'))
        employee = self.sudo().search([('user_id', '=', int(user_id))], limit=1)
        if not employee:
            raise UserError(_('No employee linked to user ID %s.') % user_id)
        return self._format_employee_profile(employee)

    @api.model
    def get_employee_profile(self, employee_id):
        """Return the full profile dict for the given employee."""
        employee = self._get_employee(employee_id)
        return self._format_employee_profile(employee)

    @api.model
    def get_contract_summary(self, employee_id):
        """Return the active contract summary dict for the given employee."""
        employee = self._get_employee(employee_id)
        try:
            contract = self.env['hr.contract'].sudo().search(
                [('employee_id', '=', employee_id), ('state', 'in', ['open', 'draft'])],
                order='date_start desc',
                limit=1,
            )
        except KeyError:
            return {}
        if not contract:
            return {}
        return self._format_contract_summary(contract)

    @api.model
    def get_employee_directory(self, company_id=None, search=None):
        """Return a summary list of all active employees for the company."""
        domain = [('active', '=', True)]
        if company_id:
            domain.append(('company_id', '=', company_id))
        if search:
            domain.append(('name', 'ilike', search))
        employees = self.sudo().search(domain, order='name asc')
        result = []
        for emp in employees:
            dept_name = emp.department_id.name if emp.department_id else ''
            job_title = emp.job_title or (emp.job_id.name if emp.job_id else '')
            result.append({
                'id': emp.id,
                'name': emp.name,
                'badge_id': emp.barcode or '',
                'email': emp.work_email or '',
                'department': dept_name,
                'job_title': job_title,
                'work_phone': emp.work_phone or '',
                'mobile_phone': emp.mobile_phone or '',
                'avatar': base64.b64encode(emp.image_128).decode('utf-8') if emp.image_128 else False,
                'company_id': emp.company_id.id if emp.company_id else False,
            })
        return result

    @api.model
    def reset_mobile_pin(self, employee_id, new_pin):
        """
        Set a new PIN for the employee in ess.employee.credential.
        Also updates the legacy mobile_pin field for backward compatibility.
        """
        employee = self._get_employee(employee_id)
        if not new_pin or len(str(new_pin)) < 4:
            raise UserError(_('PIN must be at least 4 characters.'))

        # Update new credential table
        cred = self.env['ess.employee.credential'].sudo().get_or_create_for_employee(employee_id)
        cred.write({'new_pin': str(new_pin)})

        # Keep legacy field in sync
        employee.sudo().write({'mobile_pin': self._hash_pin(str(new_pin))})
        return True

    # ─── Internal helpers ──────────────────────────────────────────────────────

    def _generate_tokens(self, employee_id):
        """
        Generate stateless tokens for direct-Odoo mode.
        When the Django backend is active, it replaces this with real JWT tokens.
        """
        return {
            'access_token': secrets.token_urlsafe(32),
            'refresh_token': secrets.token_urlsafe(32),
            'expires_in': 28800,  # 8 hours
        }

    def _hash_pin(self, pin):
        """Hash a PIN string using SHA-256. Returns hex digest string."""
        return hashlib.sha256(pin.encode('utf-8')).hexdigest()

    def _verify_pin(self, pin, hashed_pin):
        """Verify a plain PIN against its stored hash. Returns bool."""
        return self._hash_pin(str(pin)) == hashed_pin

    def _format_employee_profile(self, employee):
        """
        Format an hr.employee record into a plain dict for the mobile app.

        Field alignment with mobile UserInfo type:
          id, name, name_ar, badge_id, email, department, department_ar,
          job_title, job_title_ar, avatar, role, company_id

        NOTE: Odoo user_id is intentionally excluded — the mobile app only
        deals with employees, never with Odoo backend users.
        """
        job_title = employee.job_title or (employee.job_id.name if employee.job_id else '')
        dept_name = employee.department_id.name if employee.department_id else ''
        return {
            # ── Core identity (matches UserInfo) ──────────────────────────────
            'id': employee.id,
            'name': employee.name,
            'name_ar': employee.name,        # extend when Arabic name field exists
            'badge_id': employee.barcode or '',
            'email': employee.work_email or '',
            'department': dept_name,
            'department_ar': dept_name,      # extend when Arabic dept field exists
            'job_title': job_title,
            'job_title_ar': job_title,       # extend when Arabic job title field exists
            'avatar': base64.b64encode(employee.image_128).decode('utf-8') if employee.image_128 else False,
            'role': 'employee',              # default; extend via ess_mobile_role field if needed
            'company_id': employee.company_id.id if employee.company_id else False,
            # ── Extra context (not in UserInfo but useful) ────────────────────
            'company_name': employee.company_id.name if employee.company_id else '',
            'work_phone': employee.work_phone or '',
            'mobile_phone': employee.mobile_phone or '',
            'gender': getattr(employee, 'gender', '') or '',
            'birthday': getattr(employee, 'birthday', None) and employee.birthday.strftime('%Y-%m-%d') or False,
            'parent_id': employee.parent_id.id if employee.parent_id else False,
            'parent_name': employee.parent_id.name if employee.parent_id else '',
            'coach_id': employee.coach_id.id if employee.coach_id else False,
            'coach_name': employee.coach_id.name if employee.coach_id else '',
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
        """
        Find employee via ess.employee.credential.badge_id (mobile-specific badge).
        The badge is now owned by the credential table, not hr.employee.barcode.
        """
        cred_domain = [('badge_id', '=', badge_id), ('active', '=', True)]
        if company_id:
            cred_domain.append(('company_id', '=', company_id))
        cred = self.env['ess.employee.credential'].sudo().search(cred_domain, limit=1)
        return cred.employee_id if cred else self.env['hr.employee']

    def _resolve_username(self, username, company_id):
        """
        Resolve a username to (employee, credential).

        Lookup order:
          1. ess.employee.credential.username  (explicit mobile username)
          2. ess.employee.credential.badge_id  (badge doubles as username)
          3. hr.employee.work_email            (corporate email as fallback)

        Returns (hr.employee, ess.employee.credential | empty).
        """
        Cred = self.env['ess.employee.credential'].sudo()
        base_domain = [('active', '=', True)]
        if company_id:
            base_domain.append(('company_id', '=', company_id))

        # 1. Try explicit username field
        cred = Cred.search(base_domain + [('username', '=', username)], limit=1)
        if cred:
            return cred.employee_id, cred

        # 2. Try badge_id as username
        cred = Cred.search(base_domain + [('badge_id', '=', username)], limit=1)
        if cred:
            return cred.employee_id, cred

        # 3. Fall back to work_email on hr.employee
        emp_domain = [('work_email', '=', username)]
        if company_id:
            emp_domain = ['&', ('company_id', '=', company_id)] + emp_domain
        employee = self.sudo().search(emp_domain, limit=1)
        if not employee:
            raise UserError(_('Invalid credentials.'))
        cred = Cred.search([('employee_id', '=', employee.id), ('active', '=', True)], limit=1)
        return employee, cred
