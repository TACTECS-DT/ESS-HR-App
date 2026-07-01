"""
Ownership / BOLA (Broken Object Level Authorization) tests.

Every record-detail endpoint and every action endpoint must return
ACCESS_DENIED (HTTP 403, error.code='ACCESS_DENIED') when a regular,
non-owner employee tries to read or mutate another employee's data.

Pattern for every test:
  1. Admin (the base test employee) creates a record via the API.
  2. Attacker (a second employee with no HR roles) attempts to access it.
  3. Assert: success=false AND error.code='ACCESS_DENIED'.

APIs covered
------------
  Leave requests:           GET, PATCH, DELETE, reset
  Loans:                    GET
  Advance Salary:           GET, reset
  Expenses:                 GET, PATCH, DELETE, attach, submit
  HR Letters:               GET, PATCH, DELETE, reset
  Document Requests:        GET, PATCH, DELETE, reset
  Experience Certificates:  GET, PATCH, DELETE, reset
  Business Services:        GET, PATCH, DELETE, reset
  Personal Notes:           GET, PATCH, DELETE
  Notifications:            mark-as-read
"""
from odoo.tests import tagged
from .common import EssClientTestCase

_ATTACKER_BADGE = 'ESS_OWN_ATK_01'
_ATTACKER_PIN   = '6666'


@tagged('post_install', '-at_install', 'ess_api', 'ess_ownership')
class TestOwnership(EssClientTestCase):
    """
    Single class exercising all ownership guards across all ESS APIs.

    ``self`` (via setUp) acts as the record owner (admin employee).
    The attacker is a second employee with only base.group_user — no HR roles,
    no manager relationships — so check_record_access must deny every request.
    """

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        env = cls.env

        # ── Attacker: isolated user with no HR groups ─────────────────────────
        attacker_user = env['res.users'].sudo().search(
            [('login', '=', 'ess_own_attacker@test.local')], limit=1,
        )
        if not attacker_user:
            attacker_user = env['res.users'].sudo().create({
                'name':      'Ownership Attacker',
                'login':     'ess_own_attacker@test.local',
                'password':  'ownatk123',
                'group_ids': [(6, 0, [env.ref('base.group_user').id])],
                'company_id': cls.company_id,
            })

        existing = env['hr.employee'].sudo().search(
            [('user_id', '=', attacker_user.id), ('company_id', '=', cls.company_id)],
            limit=1,
        )
        cls.attacker_emp = existing if existing else env['hr.employee'].sudo().create({
            'name':       'Ownership Attacker Employee',
            'company_id': cls.company_id,
            'user_id':    attacker_user.id,
        })

        cred = env['ess.employee.credential'].sudo().search(
            [('employee_id', '=', cls.attacker_emp.id)], limit=1,
        )
        if cred:
            cred.write({'badge_id': _ATTACKER_BADGE, 'new_pin': _ATTACKER_PIN})
        else:
            env['ess.employee.credential'].sudo().create({
                'employee_id': cls.attacker_emp.id,
                'badge_id':    _ATTACKER_BADGE,
                'new_pin':     _ATTACKER_PIN,
            })
        cls._attacker_id = cls.attacker_emp.id

        # ── Business-service type (for business-service tests) ─────────────────
        try:
            stype = env['hr.business.service.type'].sudo().search([], limit=1)
            if not stype:
                stype = env['hr.business.service.type'].sudo().create({
                    'name': 'ESS Ownership Test Service',
                    'company_id': cls.company_id,
                })
            cls._biz_type_id = stype.id
        except Exception:
            cls._biz_type_id = None

    # ── Request helpers ───────────────────────────────────────────────────────

    def _attacker_headers(self):
        """Log in as the attacker and return auth headers for a single request."""
        result = self._call('POST', '/ess/api/auth/login', {
            'badge_id':   _ATTACKER_BADGE,
            'pin':        _ATTACKER_PIN,
            'company_id': self.company_id,
        }, auth=False, log=False)
        if not result.get('success'):
            self.skipTest('Attacker login failed — skipping ownership test')
        d = result['data']
        return {
            'Authorization':          f"Bearer {d['tokens']['access_token']}",
            'X-ESS-Company-ID':       str(self.company_id),
            'X-ESS-Employee-ID':      str(self._attacker_id),
            'X-ESS-Login-Mode':       'badge',
            'X-ESS-Login-Identifier': _ATTACKER_BADGE,
            'X-ESS-Force-Logout-Gen': str(d.get('force_logout_gen', 0)),
        }

    def _as_attacker(self, method, path, body=None):
        return self._call(method, path, body,
                          auth=False, extra_headers=self._attacker_headers())

    def assertAccessDenied(self, result, msg=None):
        self.assertFalse(
            result.get('success'),
            msg or f'Expected ACCESS_DENIED but got success. Response: {result}',
        )
        code = result.get('error', {}).get('code', '')
        self.assertEqual(
            code, 'ACCESS_DENIED',
            f'Expected ACCESS_DENIED, got {code!r}. Response: {result}',
        )

    def _any_leave_type(self):
        lt = self.env['hr.leave.type'].sudo().search(
            [('active', '=', True), ('employee_requests', '=', 'yes')], limit=1,
        )
        return lt.id if lt else None

    # ═══════════════════════════════════════════════════════════════════════════
    #  LEAVE
    # ═══════════════════════════════════════════════════════════════════════════

    def _create_leave(self, date):
        lt = self._any_leave_type()
        if not lt:
            return None
        r = self._call('POST', '/ess/api/leave/requests', {
            'leave_type_id': lt,
            'date_from': date,
            'date_to':   date,
            'description': 'ownership test',
        })
        return r['data']['id'] if r.get('success') else None

    def _cleanup_leave(self, leave_id):
        if not leave_id:
            return
        rec = self.env['hr.leave'].sudo().browse(leave_id)
        if rec.exists():
            try:
                rec.action_refuse()
            except Exception:
                pass
            rec.unlink()

    def test_leave_get_denied_for_non_owner(self):
        """GET /ess/api/leave/requests/<id> → ACCESS_DENIED for non-owner."""
        lid = self._create_leave('2026-11-03')
        if not lid:
            self.skipTest('No leave type available')
        try:
            self.assertAccessDenied(self._as_attacker('GET', f'/ess/api/leave/requests/{lid}'))
        finally:
            self._cleanup_leave(lid)

    def test_leave_patch_denied_for_non_owner(self):
        """PATCH /ess/api/leave/requests/<id> → ACCESS_DENIED for non-owner."""
        lid = self._create_leave('2026-11-04')
        if not lid:
            self.skipTest('No leave type available')
        try:
            self.assertAccessDenied(
                self._as_attacker('PATCH', f'/ess/api/leave/requests/{lid}', {'vals': {}})
            )
        finally:
            self._cleanup_leave(lid)

    def test_leave_delete_denied_for_non_owner(self):
        """DELETE /ess/api/leave/requests/<id> → ACCESS_DENIED for non-owner."""
        lid = self._create_leave('2026-11-05')
        if not lid:
            self.skipTest('No leave type available')
        try:
            self.assertAccessDenied(self._as_attacker('DELETE', f'/ess/api/leave/requests/{lid}'))
        finally:
            self._cleanup_leave(lid)

    def test_leave_reset_denied_for_non_owner(self):
        """POST /ess/api/leave/reset → ACCESS_DENIED for non-owner."""
        lid = self._create_leave('2026-11-06')
        if not lid:
            self.skipTest('No leave type available')
        try:
            self.assertAccessDenied(
                self._as_attacker('POST', '/ess/api/leave/reset', {'leave_id': lid})
            )
        finally:
            self._cleanup_leave(lid)

    # ═══════════════════════════════════════════════════════════════════════════
    #  LOANS
    # ═══════════════════════════════════════════════════════════════════════════

    def test_loan_get_denied_for_non_owner(self):
        """GET /ess/api/loans/<id> → ACCESS_DENIED for non-owner."""
        r = self._call('POST', '/ess/api/loans', {
            'loan_amount': 500, 'duration_months': 6, 'transfer_method': 'bank',
        })
        if not r.get('success'):
            self.skipTest('Loan creation blocked by business rules')
        loan_id = r['data']['id']
        try:
            self.assertAccessDenied(self._as_attacker('GET', f'/ess/api/loans/{loan_id}'))
        finally:
            self.env['hr.loan'].sudo().browse(loan_id).unlink()

    # ═══════════════════════════════════════════════════════════════════════════
    #  ADVANCE SALARY
    # ═══════════════════════════════════════════════════════════════════════════

    def _create_advance(self):
        # Create directly via ORM so the test runs regardless of whether
        # advance salary cap is configured on the company (cap = 0 would
        # cause the API create endpoint to reject the request and skipTest).
        try:
            adv = self.env['hr.advance.salary'].sudo().create({
                'employee_id': self.emp_id,
                'amount':      100.0,
                'state':       'submitted',
            })
            return adv.id
        except Exception:
            return None

    def test_advance_get_denied_for_non_owner(self):
        """GET /ess/api/advance-salary/<id> → ACCESS_DENIED for non-owner."""
        adv_id = self._create_advance()
        if not adv_id:
            self.skipTest('Advance salary model not available')
        try:
            self.assertAccessDenied(self._as_attacker('GET', f'/ess/api/advance-salary/{adv_id}'))
        finally:
            self.env['hr.advance.salary'].sudo().browse(adv_id).unlink()

    def test_advance_reset_denied_for_non_owner(self):
        """POST /ess/api/advance-salary/reset → ACCESS_DENIED for non-owner."""
        adv_id = self._create_advance()
        if not adv_id:
            self.skipTest('Advance salary model not available')
        try:
            self.assertAccessDenied(
                self._as_attacker('POST', '/ess/api/advance-salary/reset', {'advance_id': adv_id})
            )
        finally:
            self.env['hr.advance.salary'].sudo().browse(adv_id).unlink()

    # ═══════════════════════════════════════════════════════════════════════════
    #  EXPENSES
    # ═══════════════════════════════════════════════════════════════════════════

    def _create_expense(self):
        prod = self.env['product.product'].sudo().search(
            [('can_be_expensed', '=', True)], limit=1,
        )
        if not prod:
            return None
        r = self._call('POST', '/ess/api/expenses', {
            'product_id':   prod.id,
            'total_amount': 80.0,
            'currency_id':  self.company.currency_id.id or 1,
            'name':         'ownership test expense',
        })
        return r['data']['id'] if r.get('success') else None

    def test_expense_get_denied_for_non_owner(self):
        """GET /ess/api/expenses/<id> → ACCESS_DENIED for non-owner."""
        exp_id = self._create_expense()
        if not exp_id:
            self.skipTest('No expensable product available')
        try:
            self.assertAccessDenied(self._as_attacker('GET', f'/ess/api/expenses/{exp_id}'))
        finally:
            self.env['hr.expense'].sudo().browse(exp_id).unlink()

    def test_expense_patch_denied_for_non_owner(self):
        """PATCH /ess/api/expenses/<id> → ACCESS_DENIED for non-owner."""
        exp_id = self._create_expense()
        if not exp_id:
            self.skipTest('No expensable product available')
        try:
            self.assertAccessDenied(
                self._as_attacker('PATCH', f'/ess/api/expenses/{exp_id}', {'vals': {}})
            )
        finally:
            self.env['hr.expense'].sudo().browse(exp_id).unlink()

    def test_expense_delete_denied_for_non_owner(self):
        """DELETE /ess/api/expenses/<id> → ACCESS_DENIED for non-owner."""
        exp_id = self._create_expense()
        if not exp_id:
            self.skipTest('No expensable product available')
        try:
            self.assertAccessDenied(self._as_attacker('DELETE', f'/ess/api/expenses/{exp_id}'))
        finally:
            self.env['hr.expense'].sudo().browse(exp_id).unlink()

    def test_expense_attach_denied_for_non_owner(self):
        """POST /ess/api/expenses/attach → ACCESS_DENIED for non-owner."""
        exp_id = self._create_expense()
        if not exp_id:
            self.skipTest('No expensable product available')
        try:
            self.assertAccessDenied(
                self._as_attacker('POST', '/ess/api/expenses/attach', {
                    'expense_id':  exp_id,
                    'filename':    'test.pdf',
                    'file_base64': 'dGVzdA==',
                })
            )
        finally:
            self.env['hr.expense'].sudo().browse(exp_id).unlink()

    def test_expense_submit_denied_for_non_owner(self):
        """POST /ess/api/expenses/submit → ACCESS_DENIED for non-owner."""
        exp_id = self._create_expense()
        if not exp_id:
            self.skipTest('No expensable product available')
        try:
            self.assertAccessDenied(
                self._as_attacker('POST', '/ess/api/expenses/submit', {'expense_id': exp_id})
            )
        finally:
            self.env['hr.expense'].sudo().browse(exp_id).unlink()

    # ═══════════════════════════════════════════════════════════════════════════
    #  HR LETTERS
    # ═══════════════════════════════════════════════════════════════════════════

    def _create_letter(self):
        r = self._call('POST', '/ess/api/hr-letters', {
            'directed_to': 'To Whom It May Concern',
            'salary_type': 'gross',
        })
        return r['data']['id'] if r.get('success') else None

    def test_hr_letter_get_denied_for_non_owner(self):
        """GET /ess/api/hr-letters/<id> → ACCESS_DENIED for non-owner."""
        lid = self._create_letter()
        if not lid:
            self.skipTest('HR letter creation failed')
        try:
            self.assertAccessDenied(self._as_attacker('GET', f'/ess/api/hr-letters/{lid}'))
        finally:
            self.env['hr.letter.request'].sudo().browse(lid).unlink()

    def test_hr_letter_patch_denied_for_non_owner(self):
        """PATCH /ess/api/hr-letters/<id> → ACCESS_DENIED for non-owner."""
        lid = self._create_letter()
        if not lid:
            self.skipTest('HR letter creation failed')
        try:
            self.assertAccessDenied(
                self._as_attacker('PATCH', f'/ess/api/hr-letters/{lid}', {'vals': {}})
            )
        finally:
            self.env['hr.letter.request'].sudo().browse(lid).unlink()

    def test_hr_letter_delete_denied_for_non_owner(self):
        """DELETE /ess/api/hr-letters/<id> → ACCESS_DENIED for non-owner."""
        lid = self._create_letter()
        if not lid:
            self.skipTest('HR letter creation failed')
        try:
            self.assertAccessDenied(self._as_attacker('DELETE', f'/ess/api/hr-letters/{lid}'))
        finally:
            try:
                self.env['hr.letter.request'].sudo().browse(lid).unlink()
            except Exception:
                pass

    def test_hr_letter_reset_denied_for_non_owner(self):
        """POST /ess/api/hr-letters/reset → ACCESS_DENIED for non-owner."""
        lid = self._create_letter()
        if not lid:
            self.skipTest('HR letter creation failed')
        try:
            self.assertAccessDenied(
                self._as_attacker('POST', '/ess/api/hr-letters/reset', {'letter_id': lid})
            )
        finally:
            self.env['hr.letter.request'].sudo().browse(lid).unlink()

    # ═══════════════════════════════════════════════════════════════════════════
    #  DOCUMENT REQUESTS
    # ═══════════════════════════════════════════════════════════════════════════

    def _create_document(self):
        r = self._call('POST', '/ess/api/document-requests', {'document_type': 'Passport'})
        return r['data']['id'] if r.get('success') else None

    def test_document_get_denied_for_non_owner(self):
        """GET /ess/api/document-requests/<id> → ACCESS_DENIED for non-owner."""
        did = self._create_document()
        if not did:
            self.skipTest('Document request creation failed')
        try:
            self.assertAccessDenied(self._as_attacker('GET', f'/ess/api/document-requests/{did}'))
        finally:
            self.env['hr.document.request'].sudo().browse(did).unlink()

    def test_document_patch_denied_for_non_owner(self):
        """PATCH /ess/api/document-requests/<id> → ACCESS_DENIED for non-owner."""
        did = self._create_document()
        if not did:
            self.skipTest('Document request creation failed')
        try:
            self.assertAccessDenied(
                self._as_attacker('PATCH', f'/ess/api/document-requests/{did}', {'vals': {}})
            )
        finally:
            self.env['hr.document.request'].sudo().browse(did).unlink()

    def test_document_delete_denied_for_non_owner(self):
        """DELETE /ess/api/document-requests/<id> → ACCESS_DENIED for non-owner."""
        did = self._create_document()
        if not did:
            self.skipTest('Document request creation failed')
        try:
            self.assertAccessDenied(self._as_attacker('DELETE', f'/ess/api/document-requests/{did}'))
        finally:
            try:
                self.env['hr.document.request'].sudo().browse(did).unlink()
            except Exception:
                pass

    def test_document_reset_denied_for_non_owner(self):
        """POST /ess/api/document-requests/reset → ACCESS_DENIED for non-owner."""
        did = self._create_document()
        if not did:
            self.skipTest('Document request creation failed')
        try:
            self.assertAccessDenied(
                self._as_attacker('POST', '/ess/api/document-requests/reset', {'doc_id': did})
            )
        finally:
            self.env['hr.document.request'].sudo().browse(did).unlink()

    # ═══════════════════════════════════════════════════════════════════════════
    #  EXPERIENCE CERTIFICATES
    # ═══════════════════════════════════════════════════════════════════════════

    def _create_certificate(self):
        r = self._call('POST', '/ess/api/experience-certificates', {'directed_to': 'Ownership Test'})
        return r['data']['id'] if r.get('success') else None

    def test_certificate_get_denied_for_non_owner(self):
        """GET /ess/api/experience-certificates/<id> → ACCESS_DENIED for non-owner."""
        cid = self._create_certificate()
        if not cid:
            self.skipTest('Certificate creation failed')
        try:
            self.assertAccessDenied(
                self._as_attacker('GET', f'/ess/api/experience-certificates/{cid}')
            )
        finally:
            self.env['hr.experience.certificate'].sudo().browse(cid).unlink()

    def test_certificate_patch_denied_for_non_owner(self):
        """PATCH /ess/api/experience-certificates/<id> → ACCESS_DENIED for non-owner."""
        cid = self._create_certificate()
        if not cid:
            self.skipTest('Certificate creation failed')
        try:
            self.assertAccessDenied(
                self._as_attacker('PATCH', f'/ess/api/experience-certificates/{cid}', {'vals': {}})
            )
        finally:
            self.env['hr.experience.certificate'].sudo().browse(cid).unlink()

    def test_certificate_delete_denied_for_non_owner(self):
        """DELETE /ess/api/experience-certificates/<id> → ACCESS_DENIED for non-owner."""
        cid = self._create_certificate()
        if not cid:
            self.skipTest('Certificate creation failed')
        try:
            self.assertAccessDenied(
                self._as_attacker('DELETE', f'/ess/api/experience-certificates/{cid}')
            )
        finally:
            try:
                self.env['hr.experience.certificate'].sudo().browse(cid).unlink()
            except Exception:
                pass

    def test_certificate_reset_denied_for_non_owner(self):
        """POST /ess/api/experience-certificates/reset → ACCESS_DENIED for non-owner."""
        cid = self._create_certificate()
        if not cid:
            self.skipTest('Certificate creation failed')
        try:
            self.assertAccessDenied(
                self._as_attacker('POST', '/ess/api/experience-certificates/reset', {'cert_id': cid})
            )
        finally:
            self.env['hr.experience.certificate'].sudo().browse(cid).unlink()

    # ═══════════════════════════════════════════════════════════════════════════
    #  BUSINESS SERVICES
    # ═══════════════════════════════════════════════════════════════════════════

    def _create_business_service(self):
        if not self._biz_type_id:
            return None
        r = self._call('POST', '/ess/api/business-services', {
            'service_type_id': self._biz_type_id,
            'reason': 'ownership test',
        })
        return r['data']['id'] if r.get('success') else None

    def test_business_service_get_denied_for_non_owner(self):
        """GET /ess/api/business-services/<id> → ACCESS_DENIED for non-owner."""
        sid = self._create_business_service()
        if not sid:
            self.skipTest('Business service creation failed / no service type')
        try:
            self.assertAccessDenied(self._as_attacker('GET', f'/ess/api/business-services/{sid}'))
        finally:
            self.env['hr.business.service.request'].sudo().browse(sid).unlink()

    def test_business_service_patch_denied_for_non_owner(self):
        """PATCH /ess/api/business-services/<id> → ACCESS_DENIED for non-owner."""
        sid = self._create_business_service()
        if not sid:
            self.skipTest('Business service creation failed / no service type')
        try:
            self.assertAccessDenied(
                self._as_attacker('PATCH', f'/ess/api/business-services/{sid}', {'vals': {}})
            )
        finally:
            self.env['hr.business.service.request'].sudo().browse(sid).unlink()

    def test_business_service_delete_denied_for_non_owner(self):
        """DELETE /ess/api/business-services/<id> → ACCESS_DENIED for non-owner."""
        sid = self._create_business_service()
        if not sid:
            self.skipTest('Business service creation failed / no service type')
        try:
            self.assertAccessDenied(self._as_attacker('DELETE', f'/ess/api/business-services/{sid}'))
        finally:
            try:
                self.env['hr.business.service.request'].sudo().browse(sid).unlink()
            except Exception:
                pass

    def test_business_service_reset_denied_for_non_owner(self):
        """POST /ess/api/business-services/reset → ACCESS_DENIED for non-owner."""
        sid = self._create_business_service()
        if not sid:
            self.skipTest('Business service creation failed / no service type')
        try:
            self.assertAccessDenied(
                self._as_attacker('POST', '/ess/api/business-services/reset', {'service_id': sid})
            )
        finally:
            self.env['hr.business.service.request'].sudo().browse(sid).unlink()

    # ═══════════════════════════════════════════════════════════════════════════
    #  PERSONAL NOTES
    # ═══════════════════════════════════════════════════════════════════════════

    def test_note_get_denied_for_non_owner(self):
        """GET /ess/api/personal-notes/<id> → ACCESS_DENIED for non-owner."""
        note = self.env['ess.personal.note'].sudo().create({
            'employee_id': self.emp_id,
            'title': 'Secret Note',
            'body': 'Private — should not be readable by others',
        })
        try:
            self.assertAccessDenied(self._as_attacker('GET', f'/ess/api/personal-notes/{note.id}'))
        finally:
            note.unlink()

    def test_note_patch_denied_for_non_owner(self):
        """PATCH /ess/api/personal-notes/<id> → ACCESS_DENIED for non-owner."""
        note = self.env['ess.personal.note'].sudo().create({
            'employee_id': self.emp_id,
            'title': 'Patch Target Note',
            'body': 'Do not modify',
        })
        try:
            self.assertAccessDenied(
                self._as_attacker('PATCH', f'/ess/api/personal-notes/{note.id}', {
                    'vals': {'title': 'Hacked Title'},
                })
            )
        finally:
            note.unlink()

    def test_note_delete_denied_for_non_owner(self):
        """DELETE /ess/api/personal-notes/<id> → ACCESS_DENIED for non-owner."""
        note = self.env['ess.personal.note'].sudo().create({
            'employee_id': self.emp_id,
            'title': 'Delete Target Note',
            'body': 'Do not delete',
        })
        try:
            self.assertAccessDenied(self._as_attacker('DELETE', f'/ess/api/personal-notes/{note.id}'))
        finally:
            try:
                note.unlink()
            except Exception:
                pass

    # ═══════════════════════════════════════════════════════════════════════════
    #  NOTIFICATIONS
    # ═══════════════════════════════════════════════════════════════════════════

    def test_notification_mark_read_denied_for_non_owner(self):
        """POST /ess/api/notifications/<id>/read → ACCESS_DENIED for non-owner."""
        notif = self.env['ess.notification'].sudo().create({
            'employee_id': self.emp_id,
            'title': 'Secret Notification',
            'body':  'Private',
            'is_read': False,
        })
        try:
            self.assertAccessDenied(
                self._as_attacker('POST', f'/ess/api/notifications/{notif.id}/read', {})
            )
        finally:
            notif.unlink()
