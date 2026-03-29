from odoo import models, fields, api, _
from odoo.exceptions import UserError


class HrLetterRequest(models.Model):
    _name = 'hr.letter.request'
    _description = 'HR Letter Request'
    _rec_name = 'name'
    _order = 'request_date desc'
    _inherit = ['ess.mixin']

    name = fields.Char(string='Reference', readonly=True, copy=False, default='New')
    employee_id = fields.Many2one('hr.employee', string='Employee', required=True, ondelete='cascade')
    directed_to = fields.Char(string='Directed To')
    salary_type = fields.Selection(
        selection=[('net', 'Net Salary'), ('gross', 'Gross Salary')],
        string='Salary Type',
        default='gross',
    )
    state = fields.Selection(
        selection=[
            ('draft', 'Draft'),
            ('submitted', 'Submitted'),
            ('approved', 'Approved'),
            ('refused', 'Refused'),
        ],
        string='Status',
        default='draft',
    )
    reason_refusal = fields.Text(string='Reason for Refusal')
    approved_by = fields.Many2one('hr.employee', string='Approved By')
    request_date = fields.Date(string='Request Date', default=fields.Date.today)

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get('name', 'New') == 'New':
                vals['name'] = self.env['ir.sequence'].next_by_code('hr.letter.request') or 'New'
        return super().create(vals_list)

    @api.model
    def create_letter(self, employee_id, directed_to, salary_type):
        """Create a new letter request. Returns letter dict."""
        employee = self._get_employee(employee_id)
        letter = self._env_for_write(employee).create({
            'employee_id': employee_id,
            'directed_to': directed_to or '',
            'salary_type': salary_type or 'gross',
            'state': 'submitted',
            'request_date': fields.Date.today(),
        })
        return self._format_letter_record(letter)

    @api.model
    def get_letter_list(self, employee_id, state_filter=None):
        """Return list of letter requests for the employee."""
        domain = [('employee_id', '=', employee_id)]
        if state_filter:
            domain.append(('state', '=', state_filter))
        letters = self.sudo().search(domain, order='request_date desc')
        return [self._format_letter_record(l) for l in letters]

    @api.model
    def get_letter_detail(self, record_id):
        """Return a single letter request dict."""
        letter = self.sudo().browse(record_id)
        if not letter.exists():
            raise UserError(_('Letter request not found.'))
        return self._format_letter_record(letter)

    @api.model
    def update_letter(self, record_id, vals):
        """Update a draft letter request. Returns updated dict."""
        letter = self.sudo().browse(record_id)
        if not letter.exists():
            raise UserError(_('Letter request not found.'))
        if letter.state != 'draft':
            raise UserError(_('Only draft letter requests can be updated.'))
        employee = letter.employee_id
        allowed = ['directed_to', 'salary_type']
        write_vals = {k: v for k, v in vals.items() if k in allowed}
        self._env_for_write(employee).browse(letter.id).write(write_vals)
        return self._format_letter_record(letter)

    @api.model
    def delete_letter(self, record_id):
        """Delete a draft letter request. Returns True."""
        letter = self.sudo().browse(record_id)
        if not letter.exists():
            raise UserError(_('Letter request not found.'))
        if letter.state != 'draft':
            raise UserError(_('Only draft requests can be deleted.'))
        employee = letter.employee_id
        self._env_for_write(employee).browse(letter.id).unlink()
        return True

    @api.model
    def approve_letter(self, record_id, approver_employee_id):
        """Approve a letter request. Returns True."""
        letter = self.sudo().browse(record_id)
        if not letter.exists():
            raise UserError(_('Letter request not found.'))
        approver = self._get_employee(approver_employee_id)
        self._env_for_write(approver).browse(letter.id).write({'state': 'approved', 'approved_by': approver_employee_id})
        return True

    @api.model
    def refuse_letter(self, record_id, approver_employee_id, reason):
        """Refuse a letter request. Returns True."""
        letter = self.sudo().browse(record_id)
        if not letter.exists():
            raise UserError(_('Letter request not found.'))
        approver = self._get_employee(approver_employee_id)
        self._env_for_write(approver).browse(letter.id).write({
            'state': 'refused',
            'approved_by': approver_employee_id,
            'reason_refusal': reason or '',
        })
        return True

    @api.model
    def reset_letter(self, record_id):
        """Reset a letter request to draft. Returns True."""
        letter = self.sudo().browse(record_id)
        if not letter.exists():
            raise UserError(_('Letter request not found.'))
        letter.sudo().write({'state': 'draft', 'reason_refusal': False})
        return True

    def _format_letter_record(self, letter):
        """Format an hr.letter.request into a plain dict."""
        return {
            'id': letter.id,
            'name': letter.name,
            'employee_id': letter.employee_id.id,
            'employee_name': letter.employee_id.name,
            'directed_to': letter.directed_to or '',
            'salary_type': letter.salary_type,
            'state': letter.state,
            'reason_refusal': letter.reason_refusal or '',
            'approved_by': letter.approved_by.id if letter.approved_by else False,
            'approved_by_name': letter.approved_by.name if letter.approved_by else '',
            'request_date': letter.request_date.strftime('%Y-%m-%d') if letter.request_date else False,
        }


class HrDocumentRequest(models.Model):
    _name = 'hr.document.request'
    _description = 'HR Document Request'
    _rec_name = 'name'
    _order = 'request_date desc'
    _inherit = ['ess.mixin']

    name = fields.Char(string='Reference', readonly=True, copy=False, default='New')
    employee_id = fields.Many2one('hr.employee', string='Employee', required=True, ondelete='cascade')
    document_type = fields.Char(string='Document Type', required=True)
    return_date = fields.Date(string='Expected Return Date')
    state = fields.Selection(
        selection=[
            ('draft', 'Draft'),
            ('submitted', 'Submitted'),
            ('approved', 'Approved'),
            ('refused', 'Refused'),
        ],
        string='Status',
        default='draft',
    )
    reason_refusal = fields.Text(string='Reason for Refusal')
    approved_by = fields.Many2one('hr.employee', string='Approved By')
    request_date = fields.Date(string='Request Date', default=fields.Date.today)

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get('name', 'New') == 'New':
                vals['name'] = self.env['ir.sequence'].next_by_code('hr.document.request') or 'New'
        return super().create(vals_list)

    @api.model
    def create_document(self, employee_id, document_type, return_date=False):
        """Create a new document request. Returns document dict."""
        employee = self._get_employee(employee_id)
        doc = self._env_for_write(employee).create({
            'employee_id': employee_id,
            'document_type': document_type,
            'return_date': return_date or False,
            'state': 'submitted',
            'request_date': fields.Date.today(),
        })
        return self._format_document_record(doc)

    @api.model
    def get_document_list(self, employee_id, state_filter=None):
        """Return list of document requests for the employee."""
        domain = [('employee_id', '=', employee_id)]
        if state_filter:
            domain.append(('state', '=', state_filter))
        docs = self.sudo().search(domain, order='request_date desc')
        return [self._format_document_record(d) for d in docs]

    @api.model
    def get_document_detail(self, record_id):
        """Return a single document request dict."""
        doc = self.sudo().browse(record_id)
        if not doc.exists():
            raise UserError(_('Document request not found.'))
        return self._format_document_record(doc)

    @api.model
    def update_document(self, record_id, vals):
        """Update a draft document request. Returns updated dict."""
        doc = self.sudo().browse(record_id)
        if not doc.exists():
            raise UserError(_('Document request not found.'))
        if doc.state != 'draft':
            raise UserError(_('Only draft requests can be updated.'))
        employee = doc.employee_id
        allowed = ['document_type', 'return_date']
        write_vals = {k: v for k, v in vals.items() if k in allowed}
        self._env_for_write(employee).browse(doc.id).write(write_vals)
        return self._format_document_record(doc)

    @api.model
    def delete_document(self, record_id):
        """Delete a draft document request. Returns True."""
        doc = self.sudo().browse(record_id)
        if not doc.exists():
            raise UserError(_('Document request not found.'))
        if doc.state != 'draft':
            raise UserError(_('Only draft requests can be deleted.'))
        employee = doc.employee_id
        self._env_for_write(employee).browse(doc.id).unlink()
        return True

    @api.model
    def approve_document(self, record_id, approver_employee_id):
        """Approve a document request. Returns True."""
        doc = self.sudo().browse(record_id)
        if not doc.exists():
            raise UserError(_('Document request not found.'))
        approver = self._get_employee(approver_employee_id)
        self._env_for_write(approver).browse(doc.id).write({'state': 'approved', 'approved_by': approver_employee_id})
        return True

    @api.model
    def refuse_document(self, record_id, approver_employee_id, reason):
        """Refuse a document request. Returns True."""
        doc = self.sudo().browse(record_id)
        if not doc.exists():
            raise UserError(_('Document request not found.'))
        approver = self._get_employee(approver_employee_id)
        self._env_for_write(approver).browse(doc.id).write({
            'state': 'refused',
            'approved_by': approver_employee_id,
            'reason_refusal': reason or '',
        })
        return True

    @api.model
    def reset_document(self, record_id):
        """Reset a document request to draft. Returns True."""
        doc = self.sudo().browse(record_id)
        if not doc.exists():
            raise UserError(_('Document request not found.'))
        doc.sudo().write({'state': 'draft', 'reason_refusal': False})
        return True

    def _format_document_record(self, doc):
        """Format an hr.document.request into a plain dict."""
        return {
            'id': doc.id,
            'name': doc.name,
            'employee_id': doc.employee_id.id,
            'employee_name': doc.employee_id.name,
            'document_type': doc.document_type,
            'return_date': doc.return_date.strftime('%Y-%m-%d') if doc.return_date else False,
            'state': doc.state,
            'reason_refusal': doc.reason_refusal or '',
            'approved_by': doc.approved_by.id if doc.approved_by else False,
            'approved_by_name': doc.approved_by.name if doc.approved_by else '',
            'request_date': doc.request_date.strftime('%Y-%m-%d') if doc.request_date else False,
        }


class HrExperienceCertificate(models.Model):
    _name = 'hr.experience.certificate'
    _description = 'Experience Certificate Request'
    _rec_name = 'name'
    _order = 'request_date desc'
    _inherit = ['ess.mixin']

    name = fields.Char(string='Reference', readonly=True, copy=False, default='New')
    employee_id = fields.Many2one('hr.employee', string='Employee', required=True, ondelete='cascade')
    directed_to = fields.Char(string='Directed To')
    request_date = fields.Date(string='Request Date', default=fields.Date.today)
    state = fields.Selection(
        selection=[
            ('draft', 'Draft'),
            ('submitted', 'Submitted'),
            ('approved', 'Approved'),
            ('refused', 'Refused'),
        ],
        string='Status',
        default='draft',
    )
    reason_refusal = fields.Text(string='Reason for Refusal')
    approved_by = fields.Many2one('hr.employee', string='Approved By')

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get('name', 'New') == 'New':
                vals['name'] = self.env['ir.sequence'].next_by_code('hr.experience.certificate') or 'New'
        return super().create(vals_list)

    @api.model
    def create_certificate(self, employee_id, directed_to):
        """Create a new experience certificate request. Returns certificate dict."""
        employee = self._get_employee(employee_id)
        cert = self._env_for_write(employee).create({
            'employee_id': employee_id,
            'directed_to': directed_to or '',
            'state': 'submitted',
            'request_date': fields.Date.today(),
        })
        return self._format_certificate_record(cert)

    @api.model
    def get_certificate_list(self, employee_id, state_filter=None):
        """Return list of certificate requests for the employee."""
        domain = [('employee_id', '=', employee_id)]
        if state_filter:
            domain.append(('state', '=', state_filter))
        certs = self.sudo().search(domain, order='request_date desc')
        return [self._format_certificate_record(c) for c in certs]

    @api.model
    def get_certificate_detail(self, record_id):
        """Return a single certificate request dict."""
        cert = self.sudo().browse(record_id)
        if not cert.exists():
            raise UserError(_('Certificate request not found.'))
        return self._format_certificate_record(cert)

    @api.model
    def update_certificate(self, record_id, vals):
        """Update a draft certificate request. Returns updated dict."""
        cert = self.sudo().browse(record_id)
        if not cert.exists():
            raise UserError(_('Certificate request not found.'))
        if cert.state != 'draft':
            raise UserError(_('Only draft requests can be updated.'))
        employee = cert.employee_id
        allowed = ['directed_to']
        write_vals = {k: v for k, v in vals.items() if k in allowed}
        self._env_for_write(employee).browse(cert.id).write(write_vals)
        return self._format_certificate_record(cert)

    @api.model
    def delete_certificate(self, record_id):
        """Delete a draft certificate request. Returns True."""
        cert = self.sudo().browse(record_id)
        if not cert.exists():
            raise UserError(_('Certificate request not found.'))
        if cert.state != 'draft':
            raise UserError(_('Only draft requests can be deleted.'))
        employee = cert.employee_id
        self._env_for_write(employee).browse(cert.id).unlink()
        return True

    @api.model
    def approve_certificate(self, record_id, approver_employee_id):
        """Approve a certificate request. Returns True."""
        cert = self.sudo().browse(record_id)
        if not cert.exists():
            raise UserError(_('Certificate request not found.'))
        approver = self._get_employee(approver_employee_id)
        self._env_for_write(approver).browse(cert.id).write({'state': 'approved', 'approved_by': approver_employee_id})
        return True

    @api.model
    def refuse_certificate(self, record_id, approver_employee_id, reason):
        """Refuse a certificate request. Returns True."""
        cert = self.sudo().browse(record_id)
        if not cert.exists():
            raise UserError(_('Certificate request not found.'))
        approver = self._get_employee(approver_employee_id)
        self._env_for_write(approver).browse(cert.id).write({
            'state': 'refused',
            'approved_by': approver_employee_id,
            'reason_refusal': reason or '',
        })
        return True

    @api.model
    def reset_certificate(self, record_id):
        """Reset a certificate request to draft. Returns True."""
        cert = self.sudo().browse(record_id)
        if not cert.exists():
            raise UserError(_('Certificate request not found.'))
        cert.sudo().write({'state': 'draft', 'reason_refusal': False})
        return True

    def _format_certificate_record(self, cert):
        """Format an hr.experience.certificate into a plain dict."""
        return {
            'id': cert.id,
            'name': cert.name,
            'employee_id': cert.employee_id.id,
            'employee_name': cert.employee_id.name,
            'directed_to': cert.directed_to or '',
            'state': cert.state,
            'reason_refusal': cert.reason_refusal or '',
            'approved_by': cert.approved_by.id if cert.approved_by else False,
            'approved_by_name': cert.approved_by.name if cert.approved_by else '',
            'request_date': cert.request_date.strftime('%Y-%m-%d') if cert.request_date else False,
        }


class HrBusinessServiceType(models.Model):
    _name = 'hr.business.service.type'
    _description = 'Business Service Type'
    _rec_name = 'name'

    name = fields.Char(string='Service Name', required=True)
    company_id = fields.Many2one('res.company', string='Company')
    active = fields.Boolean(string='Active', default=True)


class HrBusinessServiceRequest(models.Model):
    _name = 'hr.business.service.request'
    _description = 'Business Service Request'
    _rec_name = 'name'
    _order = 'request_date desc'
    _inherit = ['ess.mixin']

    name = fields.Char(string='Reference', readonly=True, copy=False, default='New')
    employee_id = fields.Many2one('hr.employee', string='Employee', required=True, ondelete='cascade')
    service_type_id = fields.Many2one(
        'hr.business.service.type', string='Service Type', required=True, ondelete='restrict'
    )
    reason = fields.Text(string='Reason')
    requested_date = fields.Date(string='Requested Date')
    state = fields.Selection(
        selection=[
            ('draft', 'Draft'),
            ('submitted', 'Submitted'),
            ('approved', 'Approved'),
            ('refused', 'Refused'),
        ],
        string='Status',
        default='draft',
    )
    reason_refusal = fields.Text(string='Reason for Refusal')
    approved_by = fields.Many2one('hr.employee', string='Approved By')
    request_date = fields.Date(string='Request Date', default=fields.Date.today)

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get('name', 'New') == 'New':
                vals['name'] = self.env['ir.sequence'].next_by_code('hr.business.service.request') or 'New'
        return super().create(vals_list)

    @api.model
    def get_business_service_types(self, company_id):
        """Return list of active business service type dicts for the company."""
        domain = [('active', '=', True)]
        if company_id:
            domain.append(('company_id', 'in', [company_id, False]))
        types = self.env['hr.business.service.type'].sudo().search(domain)
        return [{'id': t.id, 'name': t.name} for t in types]

    @api.model
    def create_business_service(self, employee_id, service_type_id, reason, requested_date=False):
        """Create a new business service request. Returns request dict."""
        employee = self._get_employee(employee_id)
        stype = self.env['hr.business.service.type'].sudo().browse(service_type_id)
        if not stype.exists():
            raise UserError(_('Service type not found.'))
        req = self._env_for_write(employee).create({
            'employee_id': employee_id,
            'service_type_id': service_type_id,
            'reason': reason or '',
            'requested_date': requested_date or False,
            'state': 'submitted',
            'request_date': fields.Date.today(),
        })
        return self._format_business_service_record(req)

    @api.model
    def get_business_service_list(self, employee_id, state_filter=None):
        """Return list of business service requests for the employee."""
        domain = [('employee_id', '=', employee_id)]
        if state_filter:
            domain.append(('state', '=', state_filter))
        reqs = self.sudo().search(domain, order='request_date desc')
        return [self._format_business_service_record(r) for r in reqs]

    @api.model
    def get_business_service_detail(self, record_id):
        """Return a single business service request dict."""
        req = self.sudo().browse(record_id)
        if not req.exists():
            raise UserError(_('Business service request not found.'))
        return self._format_business_service_record(req)

    @api.model
    def update_business_service(self, record_id, vals):
        """Update a draft business service request. Returns updated dict."""
        req = self.sudo().browse(record_id)
        if not req.exists():
            raise UserError(_('Business service request not found.'))
        if req.state != 'draft':
            raise UserError(_('Only draft requests can be updated.'))
        employee = req.employee_id
        allowed = ['service_type_id', 'reason', 'requested_date']
        write_vals = {k: v for k, v in vals.items() if k in allowed}
        self._env_for_write(employee).browse(req.id).write(write_vals)
        return self._format_business_service_record(req)

    @api.model
    def delete_business_service(self, record_id):
        """Delete a draft business service request. Returns True."""
        req = self.sudo().browse(record_id)
        if not req.exists():
            raise UserError(_('Business service request not found.'))
        if req.state != 'draft':
            raise UserError(_('Only draft requests can be deleted.'))
        employee = req.employee_id
        self._env_for_write(employee).browse(req.id).unlink()
        return True

    @api.model
    def approve_business_service(self, record_id, approver_employee_id):
        """Approve a business service request. Returns True."""
        req = self.sudo().browse(record_id)
        if not req.exists():
            raise UserError(_('Business service request not found.'))
        approver = self._get_employee(approver_employee_id)
        self._env_for_write(approver).browse(req.id).write({'state': 'approved', 'approved_by': approver_employee_id})
        return True

    @api.model
    def refuse_business_service(self, record_id, approver_employee_id, reason):
        """Refuse a business service request. Returns True."""
        req = self.sudo().browse(record_id)
        if not req.exists():
            raise UserError(_('Business service request not found.'))
        approver = self._get_employee(approver_employee_id)
        self._env_for_write(approver).browse(req.id).write({
            'state': 'refused',
            'approved_by': approver_employee_id,
            'reason_refusal': reason or '',
        })
        return True

    @api.model
    def reset_business_service(self, record_id):
        """Reset a business service request to draft. Returns True."""
        req = self.sudo().browse(record_id)
        if not req.exists():
            raise UserError(_('Business service request not found.'))
        req.sudo().write({'state': 'draft', 'reason_refusal': False})
        return True

    def _format_business_service_record(self, req):
        """Format an hr.business.service.request into a plain dict."""
        return {
            'id': req.id,
            'name': req.name,
            'employee_id': req.employee_id.id,
            'employee_name': req.employee_id.name,
            'service_type_id': req.service_type_id.id if req.service_type_id else False,
            'service_type_name': req.service_type_id.name if req.service_type_id else '',
            'reason': req.reason or '',
            'requested_date': req.requested_date.strftime('%Y-%m-%d') if req.requested_date else False,
            'state': req.state,
            'reason_refusal': req.reason_refusal or '',
            'approved_by': req.approved_by.id if req.approved_by else False,
            'approved_by_name': req.approved_by.name if req.approved_by else '',
            'request_date': req.request_date.strftime('%Y-%m-%d') if req.request_date else False,
        }
