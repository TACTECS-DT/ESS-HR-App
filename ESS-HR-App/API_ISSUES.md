# ESS API Endpoint Test Results & Fix List

**Tested:** 2026-03-29 | **Odoo:** 19.0+e | **Employee:** 6 (Abigail Peterson) | **Company:** 1

---

## Summary

| Category | OK | FAIL |
|---|---|---|
| AUTH (7) | 7 | 0 |
| EMPLOYEE (3) | 1 | 2 |
| ATTENDANCE (8) | 2 | 6 |
| LEAVE (10) | 2 | 8 |
| PAYSLIP (3) | 1 | 2 |
| EXPENSE (8) | 4 | 4 |
| LOANS (6) | 1 | 5 |
| ADVANCE SALARY (7) | 0 | 7 |
| HR LETTERS (6) | 1 | 5 |
| DOCUMENT REQUESTS (7) | 2 | 5 |
| EXPERIENCE CERTS (6) | 1 | 5 |
| BUSINESS SERVICES (7) | 2 | 5 |
| TASKS & TIMESHEETS (8) | 2 | 6 |
| TEAM HOURS (1) | 0 | 1 |
| PENDING APPROVALS (2) | 1 | 1 |
| NOTIFICATIONS (3) | 1 | 2 |
| ANNOUNCEMENTS (1) | 0 | 1 |
| PERSONAL NOTES (5) | 2 | 3 |
| ANALYTICS (6) | 6 | 0 |
| **TOTAL (104)** | **36** | **68** |

---

## Confirmed Working ✅

```
POST /ess/api/auth/validate-license
POST /ess/api/auth/companies
POST /ess/api/auth/login
POST /ess/api/auth/refresh
POST /ess/api/auth/by-user
POST /ess/api/auth/reset-pin
POST /ess/api/auth/logout
GET  /ess/api/employees
GET  /ess/api/leave/types
GET  /ess/api/leave/requests           (returns [])
POST /ess/api/attendance/team          (returns [])
GET  /ess/api/payslip/<id>
GET  /ess/api/expenses/categories
GET  /ess/api/expenses/taxes
GET  /ess/api/expenses                 (returns [])
GET  /ess/api/expenses/<id>
POST /ess/api/expenses/attach
GET  /ess/api/loans/rules
GET  /ess/api/hr-letters               (returns [])
GET  /ess/api/document-requests/types
GET  /ess/api/document-requests        (returns [])
GET  /ess/api/experience-certificates  (returns [])
GET  /ess/api/business-services/types
GET  /ess/api/business-services        (returns [])
GET  /ess/api/tasks/<id>/attachments   (returns [])
GET  /ess/api/pending-approvals        (returns [])
POST /ess/api/notifications/read-all
POST /ess/api/personal-notes           (create)
PATCH /ess/api/personal-notes/<id>     (update)
GET  /ess/api/analytics
POST /ess/api/analytics/module-stats
POST /ess/api/analytics/employee-activity
POST /ess/api/analytics/hourly-distribution
POST /ess/api/analytics/error-summary
POST /ess/api/analytics/daily-totals
```

---

## Bug Reports

---

### BUG-01 — CRITICAL: `employee_id` Not Read from Auth Header on GET Requests

**Affects:** ~20 endpoints
**Error:** `Employee not found (id=None).` or `Employee not found.`
**Root cause:** All controllers read `employee_id = kw.get('employee_id')` from the request body.
GET requests have no body → `kw.get('employee_id')` returns `None` → model's `_get_employee(None)` fails.
The employee ID is sent in every request via `X-ESS-Employee-ID` header (captured in auth context)
but controllers never fall back to it.

**Fix:** In each controller, fall back to `get_auth_context()['employee_id']` when body has none:
```python
from .utils import call_and_log, get_body, get_auth_context

def my_endpoint(self):
    kw = get_body()
    employee_id = kw.get('employee_id') or get_auth_context().get('employee_id')
    ...
```

**Affected controllers and endpoints:**

| File | Endpoint |
|---|---|
| `controllers/employee.py` | GET /ess/api/profile |
| `controllers/employee.py` | GET /ess/api/profile/contract |
| `controllers/attendance.py` | GET /ess/api/attendance/summary |
| `controllers/attendance.py` | GET /ess/api/attendance/history |
| `controllers/attendance.py` | GET /ess/api/attendance/daily-sheet |
| `controllers/attendance.py` | GET /ess/api/attendance/monthly-sheet |
| `controllers/leave.py` | GET /ess/api/leave/balances |
| `controllers/leave.py` | GET /ess/api/leave/team-balances |
| `controllers/leave.py` | POST /ess/api/leave/approve (`manager_employee_id`) |
| `controllers/leave.py` | POST /ess/api/leave/refuse (`manager_employee_id`) |
| `controllers/leave.py` | POST /ess/api/leave/validate (`hr_employee_id`) |
| `controllers/payslip.py` | GET /ess/api/payslip |
| `controllers/loan.py` | GET /ess/api/loans |
| `controllers/advance_salary.py` | GET /ess/api/advance-salary/info |
| `controllers/advance_salary.py` | GET /ess/api/advance-salary |
| `controllers/tasks.py` | GET /ess/api/tasks |
| `controllers/tasks.py` | GET /ess/api/timesheets |
| `controllers/tasks.py` | GET /ess/api/timesheets/<id> |
| `controllers/tasks.py` | GET /ess/api/timesheets/daily |
| `controllers/tasks.py` | GET /ess/api/timesheets/weekly |
| `controllers/team.py` | GET /ess/api/team-hours |
| `controllers/notifications.py` | GET /ess/api/notifications |
| `controllers/announcements.py` | GET /ess/api/announcements |
| `controllers/personal_notes.py` | GET /ess/api/personal-notes |

---

### BUG-02 — CRITICAL: `create()` Override Incompatible with Odoo 19

**Affects:** All create operations for HR service models
**Error:** `'list' object has no attribute 'get'`
**Root cause:** In Odoo 19, the ORM calls `create()` with a **list** of dicts, not a single dict.
Our overrides do `@api.model def create(self, vals)` then `vals.get('name', 'New')`.
When `vals` is a list, `.get()` fails.
**Fix:** Replace with `@api.model_create_multi`:
```python
# BEFORE (broken in Odoo 19):
@api.model
def create(self, vals):
    if vals.get('name', 'New') == 'New':
        vals['name'] = self.env['ir.sequence'].next_by_code('hr.letter.request') or 'New'
    return super().create(vals)

# AFTER (Odoo 19 compatible):
@api.model_create_multi
def create(self, vals_list):
    for vals in vals_list:
        if vals.get('name', 'New') == 'New':
            vals['name'] = self.env['ir.sequence'].next_by_code('hr.letter.request') or 'New'
    return super().create(vals_list)
```

**Affected models (all in `models/hr_services.py` and other HR models):**

| Model class | Model name | Sequence code |
|---|---|---|
| `HrLetterRequest` | `hr.letter.request` | `hr.letter.request` |
| `HrDocumentRequest` | `hr.document.request` | `hr.document.request` |
| `HrExperienceCertificate` | `hr.experience.certificate` | `hr.experience.certificate` |
| `HrBusinessServiceRequest` | `hr.business.service.request` | `hr.business.service.request` |
| `HrLoan` | `hr.loan` | `hr.loan` |
| `HrAdvanceSalary` | `hr.advance.salary` | `hr.advance.salary` |

---

### BUG-03 — CRITICAL: `hr.contract` Model Not in Registry

**Affects:** Loan create, Advance salary create/info
**Error:** `'hr.contract'` (Python `KeyError` — model not found in ORM registry)
**Root cause:** The `hr.contract` model is defined in the `hr_contract` addon which is NOT
installed in this database. Even though `hr_payroll` is installed, it depends on `hr_contract`
as a separate module that requires explicit installation.

**Evidence:** Querying `request.registry['hr.contract']` raises `KeyError: 'hr.contract'`.

**Fix options (pick one):**
1. **Install `hr_contract`** module in Odoo (go to Apps → search `hr_contract` → Install)
2. **Guard all `hr.contract` access** with `try/except`:
   ```python
   def _get_basic_wage(self, employee):
       try:
           contract = self.env['hr.contract'].sudo().search(
               [('employee_id', '=', employee.id), ('state', 'in', ['open', 'draft'])],
               order='date_start desc', limit=1,
           )
           return contract.wage if contract else 0.0
       except KeyError:
           return 0.0  # hr.contract not installed
   ```
3. **Add `hr_contract` to `__manifest__.py` depends** (preferred — ensures it's always available):
   ```python
   'depends': ['hr', 'hr_attendance', 'hr_holidays', 'hr_payroll', 'hr_contract', ...],
   ```

**Affected methods:**
- `models/hr_loan.py`: `_validate_loan_rules()`, `_get_employee_basic_wage()`
- `models/hr_advance_salary.py`: `_get_basic_wage()`, `_validate_advance_cap()`

---

### BUG-04 — `task.planned_hours` Field Renamed in Odoo 19

**Affects:** GET /ess/api/tasks/`<id>`, GET /ess/api/tasks
**Error:** `'project.task' object has no attribute 'planned_hours'`
**Root cause:** In Odoo 19, `project.task.planned_hours` was renamed to `allocated_hours`.

**Fix in `models/project_task_ext.py`:**
```python
# BEFORE:
'planned_hours': task.planned_hours or 0.0,

# AFTER:
'planned_hours': task.allocated_hours or 0.0,  # renamed in Odoo 19
```
Also update `_format_timesheet_record` if it references `planned_hours`.

---

### BUG-05 — Payslip PDF: `_` Variable Name Conflict (UnboundLocalError)

**Affects:** POST /ess/api/payslip/pdf
**Error:** `cannot access local variable '_' where it is not associated with a value`
**Root cause:** Python 3.12+ treats `_` as a local variable throughout a function when it
appears on the left side of any assignment (here: tuple unpacking `pdf_content, _ = ...`).
Because `_` is also imported as the Odoo translation function, referencing `_('...')` in the
`except` block fails with UnboundLocalError if the exception occurs before the tuple assignment.

**Fix in `models/hr_payslip_ext.py`:**
```python
# BEFORE:
pdf_content, _ = self.env['ir.actions.report'].sudo()._render_qweb_pdf(
    report, slip.ids
)

# AFTER:
pdf_content, _report_type = self.env['ir.actions.report'].sudo()._render_qweb_pdf(
    report, slip.ids
)
```

---

### BUG-06 — Leave Get by ID: `Expected singleton: res.users()`

**Affects:** GET /ess/api/leave/requests/`<id>`
**Error:** `Expected singleton: res.users()`
**Root cause:** `get_leave_request_detail` calls `_get_approval_history(leave)` which iterates
`leave.message_ids`. In Odoo 19, message author resolution can return an empty or multi-record
`res.users` set when accessed via `sudo()` — calling `.ensure_one()` internally triggers the error.

**Fix in `models/hr_leave_ext.py` — guard `_get_approval_history`:**
```python
def _get_approval_history(self, leave):
    history = []
    try:
        for msg in leave.message_ids.sorted('date'):
            if msg.subtype_id and msg.subtype_id.name in ('Leave Approved', 'Leave Refused', 'Leave Validated'):
                history.append({
                    'date': msg.date.strftime('%Y-%m-%d %H:%M:%S') if msg.date else False,
                    'author': msg.author_id.name if msg.author_id else '',
                    'action': msg.subtype_id.name,
                    'body': msg.body or '',
                })
    except Exception:
        pass  # approval history is informational — don't fail the whole request
    return history
```

Also affects:
- POST /ess/api/leave/reset — `Expected singleton: res.users()` in same path

---

### BUG-07 — Expense Create: `Expected singleton: res.currency()`

**Affects:** POST /ess/api/expenses (create)
**Error:** `Expected singleton: res.currency()`
**Root cause:** `create_expense` calls `_env_for_write(employee)` which switches to the
employee's linked Odoo user context. In that user context, the expense model's currency
computation or the ORM's field resolution finds 0 currencies (the user's allowed company
currencies don't include the requested currency_id), then calls `.ensure_one()` → crash.

**Fix in `models/hr_expense_ext.py` — use sudo for expense creation:**
```python
def create_expense(self, employee_id, product_id, total_amount, currency_id,
                   tax_ids, payment_mode, name, date):
    employee = self._get_employee(employee_id)
    product = self.env['product.product'].sudo().browse(product_id)
    if not product.exists():
        raise UserError(_('Expense category not found.'))
    vals = {
        'employee_id': employee_id,
        'product_id': product_id,
        'total_amount': total_amount,
        'currency_id': currency_id,
        'payment_mode': payment_mode or 'own_account',
        'name': name or product.name,
        'date': date,
    }
    if tax_ids:
        vals['tax_ids'] = [(6, 0, tax_ids)]
    expense = self.sudo().create(vals)  # <-- use sudo(), not _env_for_write()
    return self._format_expense_record(expense)
```

---

### BUG-08 — Expense Currencies Endpoint: `Expected singleton: res.currency()`

**Affects:** GET /ess/api/expenses/currencies
**Error:** `Expected singleton: res.currency()` (same symptom as Bug-07)
**Root cause:** `get_currencies()` accesses `c.rate` for each currency. In Odoo 19,
`res.currency.rate` is a computed field that may call `ensure_one()` internally and fail
when the rate table has no entry for that currency/company combination.

**Fix in `models/hr_expense_ext.py`:**
```python
def get_currencies(self):
    currencies = self.env['res.currency'].sudo().search([('active', '=', True)])
    result = []
    for c in currencies:
        try:
            rate = c.rate
        except Exception:
            rate = 1.0
        result.append({
            'id': c.id,
            'name': c.name,
            'symbol': c.symbol,
            'rate': rate,
        })
    return result
```

---

### BUG-09 — Personal Notes GET/DELETE by ID: `Access denied` (missing employee_id)

**Affects:** GET /ess/api/personal-notes/`<id>`, DELETE /ess/api/personal-notes/`<id>`
**Error:** `Access denied.`
**Root cause:** `get_note_detail` and `delete_note` verify ownership via
`note.employee_id.id != employee_id`. For GET/DELETE requests, the controller reads
`employee_id = kw.get('employee_id')` from the body, which is `None` since there is no body.
`note.employee_id.id (6) != None` → True → "Access denied."

**Fix in `controllers/personal_notes.py`:**
```python
def note_by_id(self, note_id):
    kw = get_body()
    employee_id = kw.get('employee_id') or get_auth_context().get('employee_id')  # <-- fallback
    ...
```

---

### BUG-10 — Attendance Check-In: `Invalid timestamp format: None`

**Affects:** POST /ess/api/attendance/check-in
**Error:** `Invalid timestamp format: None. Use YYYY-MM-DD HH:MM:SS.`
**Root cause:** The controller reads `kw.get('timestamp')` — when the mobile app doesn't
send a timestamp (the app uses server time), it's None and the model rejects it.

**Fix in `models/hr_attendance_ext.py` — default to now when timestamp is None:**
```python
def ess_check_in(self, employee_id, timestamp, latitude, longitude, task_id=False):
    from odoo import fields as odoo_fields
    if not timestamp:
        timestamp = odoo_fields.Datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    ...
```

Same fix needed in `ess_check_out`.

---

### BUG-11 — Attendance Manual Create: SERVER_ERROR

**Affects:** POST /ess/api/attendance/manual
**Error:** Logged as unexpected server error
**Root cause:** Likely the same `create()` Odoo 19 ORM issue (Bug-02) or missing employee_id
from auth context. Need to check Odoo log for exact traceback.

**Action:** After fixing Bug-01 and Bug-02, re-test this endpoint.

---

### BUG-12 — Pending Approvals Action: `Unknown item type: None`

**Affects:** POST /ess/api/pending-approvals/`<item_id>`/action
**Error:** `Unknown item type: None`
**Root cause:** The controller reads `kw.get('item_type')` from the body to dispatch
the action to the right model. The mobile test sent only `{"action":"approve"}` without
`item_type` in the body.

**This is NOT a bug in the server** — the client (mobile app) must send `item_type`
in the request body. Check the mobile side to confirm `item_type` is included.

**If it IS expected to be auto-detected**, add lookup logic in `controllers/pending_approvals.py`
to determine the item type from the item_id alone.

---

### BUG-13 — Notification Mark Single Read: `Notification not found`

**Affects:** POST /ess/api/notifications/`<id>`/read
**Error:** `Notification not found.`
**Note:** This is a data issue — notification ID 1 doesn't exist. The endpoint itself works
correctly (`mark_all_as_read` returned OK with `{"updated": 0}`). No code fix needed,
but verify the mobile app only tries to mark notifications that actually exist.

---

### BUG-14 — Leave Create: `Leave type not found`

**Affects:** POST /ess/api/leave/requests (create)
**Error:** `Leave type not found.`
**Root cause:** Test used `holiday_status_id: 1` but that leave type ID doesn't exist.
The correct field name to pass from the client is `leave_type_id` (not `holiday_status_id`).

Check `controllers/leave.py`:
```python
kw.get('leave_type_id'),  # <-- client must send this key
```
The mobile app must send `leave_type_id`, not `holiday_status_id`. Verify the mobile API call.

---

### BUG-15 — Payslip List: Employee Not Found (also covered by Bug-01)

**Affects:** GET /ess/api/payslip
Already covered under Bug-01 — same root cause.

---

## Endpoints with Data-Only Failures (no code fix needed)

These return correct errors because test data doesn't exist. Once creates work (after Bug-02 fix):

| Endpoint | Error | Reason |
|---|---|---|
| GET /ess/api/loans/`<id>` | Loan not found | No loans in DB for employee 6 |
| GET /ess/api/advance-salary/`<id>` | Advance not found | No advances in DB |
| GET /ess/api/hr-letters/`<id>` | Letter not found | No letters in DB |
| POST /ess/api/hr-letters/approve | Letter not found | No letters in DB |
| POST /ess/api/hr-letters/refuse | Letter not found | No letters in DB |
| GET /ess/api/document-requests/`<id>` | Doc not found | No docs in DB |
| GET /ess/api/experience-certificates/`<id>` | Cert not found | No certs in DB |
| GET /ess/api/business-services/`<id>` | Service not found | No services in DB |
| POST /ess/api/leave/approve | Employee not found | Bug-01 also |
| POST /ess/api/expense/submit | "Only draft expenses can be modified" | Expense id=1 already submitted |

---

## Fix Priority

| Priority | Bug | Endpoint Impact |
|---|---|---|
| P0 | BUG-01: employee_id from header | 24 endpoints |
| P0 | BUG-02: `create()` signature Odoo 19 | 6 create operations |
| P0 | BUG-03: `hr.contract` not installed | loan + advance |
| P1 | BUG-04: `planned_hours` → `allocated_hours` | tasks get |
| P1 | BUG-05: payslip PDF `_` conflict | payslip pdf |
| P1 | BUG-06: leave get by id singleton error | leave detail |
| P1 | BUG-07: expense create currency | expense create |
| P1 | BUG-08: currencies endpoint | currencies list |
| P1 | BUG-09: personal notes access denied | notes get/delete |
| P2 | BUG-10: check-in timestamp default | attendance check-in |
| P2 | BUG-11: attendance manual | attendance manual |
| P3 | BUG-12: pending action item_type | pending approvals |
| P3 | BUG-14: leave type id field name | leave create |

---

## Test Credentials Used

```
Odoo DB:     ess-19
License key: 111
Server URL:  ser1
Employee:    6 (Abigail Peterson, company 1 - YourCompany)
Badge ID:    001
PIN:         1234
Token:       refreshed each test run via /ess/api/auth/login
```

## Quick Re-Test Command

```bash
# After server restart — get new token first:
curl -s http://localhost:8055/ess/api/auth/login \
  -X POST -H "Content-Type: application/json" \
  -d '{"badge_id":"001","pin":"1234","company_id":1}'

# Then update TOKEN in test_ess.sh and run:
bash /d/ESS-HR-App/test_ess.sh
```
