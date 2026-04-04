from odoo import http
from odoo.http import request
from odoo.exceptions import UserError

from .utils import call_and_log, get_body, get_auth_context


class PendingApprovalsController(http.Controller):

    @http.route('/ess/api/pending-approvals', type='http', auth='none', methods=['GET', 'POST'], csrf=False, readonly=False)
    def list(self):
        kw = get_body()
        employee_id = kw.get('employee_id') or get_auth_context().get('employee_id')
        return call_and_log(
            '/ess/api/pending-approvals',
            lambda: _gather_pending(request, employee_id),
        )

    @http.route('/ess/api/pending-approvals/<int:item_id>/action', type='http', auth='none', methods=['POST'], csrf=False, readonly=False)
    def action(self, item_id):
        kw = get_body()
        employee_id = kw.get('employee_id') or get_auth_context().get('employee_id')
        item_type = kw.get('type')
        action_name = kw.get('action')
        reason = kw.get('reason', '')
        return call_and_log(
            '/ess/api/pending-approvals/<id>/action',
            lambda: _dispatch_action(request, item_id, item_type, action_name, employee_id, reason),
        )


def _gather_pending(req, approver_employee_id):
    result = []
    env = req.env

    leaves = env['hr.leave'].sudo().search([
        ('state', 'in', ('confirm', 'validate1')),
        ('employee_id.parent_id', '=', approver_employee_id),
    ])
    for l in leaves:
        result.append({
            'id': l.id, 'type': 'leave',
            'employee_name': l.employee_id.name,
            'description': '%s — %s to %s' % (
                l.holiday_status_id.name,
                l.date_from.strftime('%Y-%m-%d') if l.date_from else '',
                l.date_to.strftime('%Y-%m-%d') if l.date_to else '',
            ),
            'request_date': l.date_from.strftime('%Y-%m-%d') if l.date_from else False,
            'state': l.state,
        })

    loans = env['hr.loan'].sudo().search([
        ('state', '=', 'submitted'),
        ('employee_id.parent_id', '=', approver_employee_id),
    ])
    for l in loans:
        result.append({
            'id': l.id, 'type': 'loan',
            'employee_name': l.employee_id.name,
            'description': '%s — %s' % (l.name, l.amount),
            'request_date': l.request_date.strftime('%Y-%m-%d') if l.request_date else False,
            'state': l.state,
        })

    advances = env['hr.advance.salary'].sudo().search([
        ('state', '=', 'submitted'),
        ('employee_id.parent_id', '=', approver_employee_id),
    ])
    for a in advances:
        result.append({
            'id': a.id, 'type': 'advance_salary',
            'employee_name': a.employee_id.name,
            'description': '%s — %s' % (a.name, a.amount),
            'request_date': a.request_date.strftime('%Y-%m-%d') if a.request_date else False,
            'state': a.state,
        })

    letters = env['hr.letter.request'].sudo().search([
        ('state', '=', 'submitted'),
        ('employee_id.parent_id', '=', approver_employee_id),
    ])
    for lt in letters:
        result.append({
            'id': lt.id, 'type': 'hr_letter',
            'employee_name': lt.employee_id.name,
            'description': '%s — %s' % (lt.name, lt.salary_type),
            'request_date': lt.request_date.strftime('%Y-%m-%d') if lt.request_date else False,
            'state': lt.state,
        })

    docs = env['hr.document.request'].sudo().search([
        ('state', '=', 'submitted'),
        ('employee_id.parent_id', '=', approver_employee_id),
    ])
    for d in docs:
        result.append({
            'id': d.id, 'type': 'document_request',
            'employee_name': d.employee_id.name,
            'description': '%s — %s' % (d.name, d.document_type),
            'request_date': d.request_date.strftime('%Y-%m-%d') if d.request_date else False,
            'state': d.state,
        })

    certs = env['hr.experience.certificate'].sudo().search([
        ('state', '=', 'submitted'),
        ('employee_id.parent_id', '=', approver_employee_id),
    ])
    for c in certs:
        result.append({
            'id': c.id, 'type': 'experience_certificate',
            'employee_name': c.employee_id.name,
            'description': c.name,
            'request_date': c.request_date.strftime('%Y-%m-%d') if c.request_date else False,
            'state': c.state,
        })

    services = env['hr.business.service.request'].sudo().search([
        ('state', '=', 'submitted'),
        ('employee_id.parent_id', '=', approver_employee_id),
    ])
    for s in services:
        result.append({
            'id': s.id, 'type': 'business_service',
            'employee_name': s.employee_id.name,
            'description': '%s — %s' % (s.name, s.service_type_id.name if s.service_type_id else ''),
            'request_date': s.request_date.strftime('%Y-%m-%d') if s.request_date else False,
            'state': s.state,
        })

    return result


def _dispatch_action(req, item_id, item_type, action_name, approver_id, reason):
    env = req.env
    _type_map = {
        'leave': ('hr.leave', 'approve_leave', 'refuse_leave'),
        'loan': ('hr.loan', 'approve_loan', 'refuse_loan'),
        'advance_salary': ('hr.advance.salary', 'approve_advance_salary', 'refuse_advance_salary'),
        'hr_letter': ('hr.letter.request', 'approve_letter', 'refuse_letter'),
        'document_request': ('hr.document.request', 'approve_document', 'refuse_document'),
        'experience_certificate': ('hr.experience.certificate', 'approve_certificate', 'refuse_certificate'),
        'business_service': ('hr.business.service.request', 'approve_business_service', 'refuse_business_service'),
    }
    if item_type not in _type_map:
        raise UserError('Unknown item type: %s' % item_type)
    model_name, approve_method, refuse_method = _type_map[item_type]
    model = env[model_name].sudo()
    if action_name == 'approve':
        return getattr(model, approve_method)(item_id, approver_id)
    elif action_name == 'refuse':
        return getattr(model, refuse_method)(item_id, approver_id, reason)
    else:
        raise UserError('Unknown action: %s. Use approve or refuse.' % action_name)
