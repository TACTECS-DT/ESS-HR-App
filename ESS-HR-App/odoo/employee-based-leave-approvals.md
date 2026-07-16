# Plan: Employee-Based Leave Approvals (zero Odoo users for managers)

**Module:** `ess_hr_client` (Odoo 19) — `D:\ESS-HR-App\odoo\ess_hr_client`
**Status:** Planned, not implemented. No code has been changed yet.
**Related:** `D:\ESS-HR-App\security-check\audit-report.md` — addendum at the bottom
records why the existing **C-1 token-validation gap** matters more once this plan
ships, and is tracked there separately (deferred, owner will fix later).

## Goal
Managers should need **zero Odoo user accounts** to approve their team's leave
requests — only the mobile app, driven entirely by `hr.employee` identity.

## Why this is needed
Odoo's native leave approval (`leave_manager_id` on `hr.employee`) is a `res.users`
reference. Even in this app, where managers never log into Odoo's web UI and every
mobile-driven write already runs via `with_user(SUPERUSER_ID)`, the approval
*authorization check itself* still resolves `manager_employee_id → hr.employee.user_id`
and compares that against `leave_manager_id`. That's the only reason a manager still
needs a linked user account today (one they never log into or know the password for).

Every other approval type in this app (loans, advances, letters, documents,
certificates, business service requests) already authorizes managers via
`employee_id.parent_id` — pure employee-to-employee, no user involved. Leave is the
one outlier. This plan brings it in line with the rest of the app.

## Accepted decisions
- **No automatic fallback.** If the new approver field is empty on an employee,
  approval/refusal is blocked with a clear error until HR sets it — it does **not**
  silently fall back to `parent_id`.
- **Changes live inside `ess_hr_client`**, next to the code they modify — no new
  separate module.
- **Token verification (the C-1 audit gap) is explicitly out of scope for this plan** —
  tracked and deferred separately in the security audit report. Execution already runs
  as SUPERUSER regardless of that gap, so this plan is not blocked by it, but it should
  be fixed before this feature is relied on in production (see the audit addendum).

## Known, accepted tradeoffs
- This custom check becomes the *only* security boundary for leave approval — Odoo's
  `ir.rule` no longer helps here, since everything runs via sudo.
- Native Odoo-side features tied to a real user (backend "To Approve" activities in
  Discuss) won't reflect these approvals — not a problem since these managers never
  use the Odoo backend UI, just noting it's not a full equivalent.
- This logic must be re-verified on every future Odoo/`hr_holidays` upgrade.
- **Every employee's new approver field starts empty.** No mobile leave approvals will
  work until HR populates it for each employee — this is a rollout task, not a bug to
  discover later.

## Changes

### 1. New employee-based approver field
`models/hr_employee_ext.py` — add to `HrEmployeeExt` (already
`_inherit = ['hr.employee', 'ess.mixin']`, alongside existing `mobile_pin` /
`ess_credential_ids`):

```python
mobile_leave_approver_id = fields.Many2one(
    'hr.employee', string='Mobile Leave Approver',
    help='Employee authorized to approve/refuse this employee's leave requests via '
         'the mobile app. No automatic fallback — required for mobile approval.',
)
```

Plus an `@api.constrains` guard rejecting an employee being their own approver.
Expose it in `_format_employee_profile()` alongside the existing `parent_id` /
`coach_id` pair (`mobile_leave_approver_id` + `_name`).

**View:** extend the existing `views/ess_employee_credential_views.xml` inherited form
view (the one already adding the "ESS Mobile" notebook page,
`view_hr_employee_ess_credentials_tab`) — add the new field inside that same page, next
to `ess_credential_ids`. No new view file, no new `ir.model.access.csv` row needed
(inherits native `hr.employee` access).

### 2. Swap every leave-authorization call site from user-based to employee-based
All in `ess_hr_client`, no core Odoo/`hr_holidays` changes:

- **`models/ess_mixin.py`** — add one shared helper (no existing equivalent found):
  `_is_leave_approver(self, approver_employee_id, leave_employee)` → compares
  `leave_employee.mobile_leave_approver_id.id == approver_employee_id`.

- **`models/hr_leave_ext.py`**
  - `_can_employee_approve_leave()` — replace the `user_id` / `leave_manager_id`
    comparison with the new mixin helper; keep the existing HR/admin group bypass
    (that legitimately still needs a real user, since Odoo groups are user-based).
  - `approve_leave()` — same swap. If `leave_employee.mobile_leave_approver_id` is
    empty, raise `UserError` naming the employee and asking HR to assign an approver
    (the "no fallback, block until set" behavior).
  - `refuse_leave()` — **currently has no authorization check at all** (a pre-existing
    gap — also flagged independently as **H-3** in the security audit). Add the same
    check here too, since refusing is exactly as sensitive as approving.
  - `_get_leave_managed_employee_ids(user)` → replace with
    `_get_leave_managed_employee_ids_by_employee(manager_employee_id)`, searching
    `mobile_leave_approver_id = manager_employee_id` instead of `leave_manager_id = user.id`.
  - `get_leave_requests()` (scope='all' branch) — call the new method directly with
    `employee_id`; drop the `and employee.user_id` guard entirely.
  - `_compute_ess_role()` — restructure so the admin/hr checks (still user/group-based,
    unchanged) run only `if employee.user_id`, but the "manager" signal now checks
    `mobile_leave_approver_id = employee.id` (no user needed) instead of
    `leave_manager_id = user.id`; also fix `is_direct_manager` to compare
    `parent_id = employee.id` (pure employee) instead of `parent_id.user_id = user.id`,
    for consistency with how loans/advances already treat `parent_id`. Leave
    `attendance_manager_id` untouched (separate feature, out of scope) but guard its
    `.user_id` access safely since employee may now have none.

- **`controllers/pending_approvals.py`**
  - `_resolve_approver_role()` — same restructure as `_compute_ess_role` (currently a
    near-duplicate; keep them in sync).
  - `_gather_pending()` — manager branch currently requires `approver_emp.user_id` to
    list pending leaves at all (a real bug for a userless manager today) and filters on
    `employee_id.leave_manager_id`. Drop the `user_id` guard, filter on
    `employee_id.mobile_leave_approver_id` instead.

- **`controllers/utils.py::check_record_access()`** — currently hard-requires
  `acting_emp.user_id` before any manager-level GET access is even considered.
  Restructure so the HR/admin group bypass stays user-gated, but the "are you this
  employee's manager" check (both `parent_id` and the new `mobile_leave_approver_id`)
  compares employee IDs directly — no `user_id` required for a manager to view their
  team's leave.

### 3. Chatter audit note on approve/refuse
In `approve_leave()` and `refuse_leave()`, after the state-changing action, add:

```python
leave.with_user(SUPERUSER_ID).message_post(
    body=_('Approved via mobile app by %s.') % manager_emp.name,
)
```

(and the refuse equivalent, merged with the existing refusal-reason post). This makes
the real approver visible in Odoo's own chatter, since `write_uid` will otherwise
always show the superuser once the `user_id` check is gone.

### 4. Execution stays on SUPERUSER (no change needed)
All mobile-driven writes already execute via `with_user(SUPERUSER_ID)` today — this
was never the blocker. No change required here; noted for completeness since it's the
reason steps 1–3 are sufficient without touching Odoo's session/security layer.

## Files touched (all inside `D:\ESS-HR-App\odoo\ess_hr_client`)
- `models/hr_employee_ext.py` — new field, constraint, profile dict, `_compute_ess_role`
- `models/hr_leave_ext.py` — `_can_employee_approve_leave`, `approve_leave`,
  `refuse_leave`, `_get_leave_managed_employee_ids*`, `get_leave_requests`
- `models/ess_mixin.py` — new `_is_leave_approver` helper
- `controllers/utils.py` — `check_record_access`
- `controllers/pending_approvals.py` — `_resolve_approver_role`, `_gather_pending`
- `views/ess_employee_credential_views.xml` — add the new field to the existing tab

## Tests to update/add (in `tests/`)
- `test_leave.py` — update any fixture relying on `leave_manager_id` to set
  `mobile_leave_approver_id` instead; add cases: approval blocked when unset, rejected
  when acting employee isn't the assigned approver, HR/admin bypass still works,
  chatter message present after approve/refuse.

## Verification
- Run this module's existing test suite (`RUN TESTS.bat` in `D:\ESS-HR-App\odoo`, or
  targeted `odoo-bin -i ess_hr_client --test-enable --stop-after-init`) — confirm
  updated/new tests pass and nothing previously passing regresses.
- Manually exercise via the mobile app or a REST client: set `mobile_leave_approver_id`
  on a test employee with no `user_id`, submit a leave as that employee, approve it as
  the approver employee (also no `user_id`) — confirm success and confirm the chatter
  note names the real approver.
