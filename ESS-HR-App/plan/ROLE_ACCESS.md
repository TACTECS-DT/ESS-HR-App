# Role-Based Access Control (RBAC)

> Mirrors Odoo HR module permissions exactly.
> The user's `role` is returned by `POST /auth/login` and stored in Redux auth state.

---

## Roles

| Role | Odoo Equivalent | Data Scope |
|---|---|---|
| `employee` | `base.group_user` — Internal User | Own records only |
| `manager` | `hr.group_hr_user` + set as leave/expense approver | Own + direct/indirect subordinates (parent_id chain) |
| `hr` | `hr.group_hr_manager` — HR Officer | All employees |
| `admin` | `base.group_system` + HR Administrator | All records, no restrictions |

---

## Data Scope Rules

| Scope | API Filter Behaviour |
|---|---|
| `own` | filter by `employee_id == me` |
| `subordinates` | `employee_id == me` OR employee is in manager's subordinate chain |
| `all` | no employee filter — full company dataset |

---

## Module Permissions

---

### Attendance
> Odoo module: `hr.attendance`

| Permission | employee | manager | hr | admin |
|---|:---:|:---:|:---:|:---:|
| **Data scope** | `own` | `subordinates` | `all` | `all` |
| Check in (own) | ✅ | ✅ | ✅ | ✅ |
| Check out (own) | ✅ | ✅ | ✅ | ✅ |
| View history | ✅ | ✅ | ✅ | ✅ |
| View team attendance | ❌ | ✅ | ✅ | ✅ |
| Manually create/edit records | ❌ | ❌ | ✅ | ✅ |

> **Note:** Manual edit requires `hr_attendance.group_hr_attendance_user` in Odoo. Managers cannot manually add attendance — only HR Officer and above.

---

### Leave / Time Off
> Odoo module: `hr_holidays`

| Permission | employee | manager | hr | admin |
|---|:---:|:---:|:---:|:---:|
| **Data scope** | `own` | `subordinates` | `all` | `all` |
| Create own leave request | ✅ | ✅ | ✅ | ✅ |
| View leave requests | ✅ | ✅ | ✅ | ✅ |
| View own balances | ✅ | ✅ | ✅ | ✅ |
| View team balances screen | ❌ | ✅ | ✅ | ✅ |
| Approve — first level (Manager) | ❌ | ✅ | ✅ | ✅ |
| Approve — second level / validate (HR) | ❌ | ❌ | ✅ | ✅ |
| Refuse | ❌ | ✅ | ✅ | ✅ |
| Reset refused → draft | ✅ (own only) | ✅ | ✅ | ✅ |
| Delete own draft | ✅ | ✅ | ✅ | ✅ |

> **Note:** With 2-level validation mode in Odoo: Manager does first confirm, HR Officer does final validate. Employee can only reset their own refused requests.

---

### Payslip
> Odoo module: `hr_payroll`

| Permission | employee | manager | hr | admin |
|---|:---:|:---:|:---:|:---:|
| **Data scope** | `own` | `own` | `all` | `all` |
| View payslips | ✅ | ✅ | ✅ | ✅ |
| Download PDF | ✅ | ✅ | ✅ | ✅ |

> **Note:** Salary is strictly confidential in Odoo. Managers do **NOT** see subordinates' payslips — their scope is intentionally `own`, not `subordinates`. Only HR Officer and Admin have full payslip access.

---

### Expenses
> Odoo module: `hr_expense`

| Permission | employee | manager | hr | admin |
|---|:---:|:---:|:---:|:---:|
| **Data scope** | `own` | `subordinates` | `all` | `all` |
| Create own expense | ✅ | ✅ | ✅ | ✅ |
| View expenses | ✅ | ✅ | ✅ | ✅ |
| Delete own draft | ✅ | ✅ | ✅ | ✅ |
| Approve — first level (Manager) | ❌ | ✅ | ✅ | ✅ |
| Approve — second level (HR/Accounting) | ❌ | ❌ | ✅ | ✅ |
| Refuse | ❌ | ✅ | ✅ | ✅ |

---

### Loans
> Odoo module: custom loan module

| Permission | employee | manager | hr | admin |
|---|:---:|:---:|:---:|:---:|
| **Data scope** | `own` | `subordinates` | `all` | `all` |
| Create loan request (if eligible) | ✅ | ✅ | ✅ | ✅ |
| View loans + installment schedule | ✅ | ✅ | ✅ | ✅ |
| Approve — Manager level (1st) | ❌ | ✅ | ✅ | ✅ |
| Approve — HR level (2nd) | ❌ | ❌ | ✅ | ✅ |
| Approve — CEO level (3rd) | ❌ | ❌ | ❌ | ✅ |
| Refuse | ❌ | ✅ | ✅ | ✅ |

> **Approval chain:** Employee → Manager → HR → CEO (Admin acts as CEO approver).

---

### Advance Salary
> Odoo module: custom advance salary module

| Permission | employee | manager | hr | admin |
|---|:---:|:---:|:---:|:---:|
| **Data scope** | `own` | `subordinates` | `all` | `all` |
| Create request (max 50% basic salary) | ✅ | ✅ | ✅ | ✅ |
| View requests | ✅ | ✅ | ✅ | ✅ |
| Approve — first level (Manager) | ❌ | ✅ | ✅ | ✅ |
| Approve — second level (HR) | ❌ | ❌ | ✅ | ✅ |
| Refuse | ❌ | ✅ | ✅ | ✅ |

---

### HR Letters
> Odoo module: custom hr_letter module

| Permission | employee | manager | hr | admin |
|---|:---:|:---:|:---:|:---:|
| **Data scope** | `own` | `own` | `all` | `all` |
| Request HR letter for self | ✅ | ✅ | ✅ | ✅ |
| View own requests | ✅ | ✅ | ✅ | ✅ |
| Approve / Refuse | ❌ | ❌ | ✅ | ✅ |

> **Note:** Managers have no approval role here. HR Officer is the sole approver. Manager scope is `own` — they cannot see subordinates' HR letter requests.

---

### Document Requests
> Odoo module: custom document custody module

| Permission | employee | manager | hr | admin |
|---|:---:|:---:|:---:|:---:|
| **Data scope** | `own` | `own` | `all` | `all` |
| Request document return | ✅ | ✅ | ✅ | ✅ |
| View own requests | ✅ | ✅ | ✅ | ✅ |
| Approve / Refuse | ❌ | ❌ | ✅ | ✅ |

> **Note:** HR manages all original document custody. Managers have no approval role.

---

### Experience Certificates
> Odoo module: custom certificate module

| Permission | employee | manager | hr | admin |
|---|:---:|:---:|:---:|:---:|
| **Data scope** | `own` | `own` | `all` | `all` |
| Request certificate | ✅ | ✅ | ✅ | ✅ |
| View own requests | ✅ | ✅ | ✅ | ✅ |
| Approve / Refuse (issue certificate) | ❌ | ❌ | ✅ | ✅ |

---

### Business Services
> Odoo module: custom service request module (SIM card, laptop, parking, etc.)

| Permission | employee | manager | hr | admin |
|---|:---:|:---:|:---:|:---:|
| **Data scope** | `own` | `subordinates` | `all` | `all` |
| Create service request | ✅ | ✅ | ✅ | ✅ |
| View requests | ✅ | ✅ | ✅ | ✅ |
| Approve — first level (Manager) | ❌ | ✅ | ❌ | ✅ |
| Refuse | ❌ | ✅ | ❌ | ✅ |

> **Note:** IT / Facilities handle fulfilment outside the app. HR has no approval role for business services — Manager approves for their team.

---

### Tasks
> Odoo module: `project.task`

| Permission | employee | manager | hr | admin |
|---|:---:|:---:|:---:|:---:|
| **Data scope** | `own` (assigned tasks) | `subordinates` (team/project tasks) | `own` | `all` |
| View tasks | ✅ | ✅ | ✅ | ✅ |
| Update task stage | ✅ | ✅ | ✅ | ✅ |
| Log time on tasks | ✅ | ✅ | ✅ | ✅ |
| Add attachments | ✅ | ✅ | ✅ | ✅ |
| Assign tasks to others | ❌ | ✅ | ❌ | ✅ |
| View team hours screen | ❌ | ✅ | ✅ | ✅ |

> **Note:** HR role follows employee-level task access (own assigned tasks only) — HR is not a project manager in Odoo.

---

### Timesheets
> Odoo module: `account.analytic.line` (timesheets)

| Permission | employee | manager | hr | admin |
|---|:---:|:---:|:---:|:---:|
| **Data scope** | `own` | `subordinates` | `all` | `all` |
| View timesheets | ✅ | ✅ | ✅ | ✅ |
| Log time | ✅ | ✅ | ✅ | ✅ |
| View weekly team summary | ❌ | ✅ | ✅ | ✅ |

---

### Pending Approvals
> Screen showing all pending approval actions for the logged-in approver.

| Permission | employee | manager | hr | admin |
|---|:---:|:---:|:---:|:---:|
| Access Pending Approvals screen | ❌ | ✅ | ✅ | ✅ |
| Action — Leave | ❌ | ✅ (1st level) | ✅ (2nd level) | ✅ |
| Action — Expense | ❌ | ✅ (1st level) | ✅ (2nd level) | ✅ |
| Action — Loan | ❌ | ✅ (Manager level) | ✅ (HR level) | ✅ (CEO level) |
| Action — Advance Salary | ❌ | ✅ (1st level) | ✅ (2nd level) | ✅ |
| Action — HR Letters / Docs / Certs | ❌ | ❌ | ✅ | ✅ |
| Action — Business Services | ❌ | ✅ | ❌ | ✅ |

> **Note:** Employees track approval status inside their own requests — they never see the Pending Approvals list screen.

---

### Analytics
> Manager/HR dashboard with attendance, leave, overtime, and expense KPIs.

| Permission | employee | manager | hr | admin |
|---|:---:|:---:|:---:|:---:|
| **Data scope** | — | `subordinates` | `all` | `all` |
| Access Analytics screen | ❌ | ✅ | ✅ | ✅ |

---

### Home Dashboard

| Widget | employee | manager | hr | admin |
|---|:---:|:---:|:---:|:---:|
| Own leave balance cards | ✅ | ✅ | ✅ | ✅ |
| Pending approvals badge | ❌ | ✅ | ✅ | ✅ |
| Team / company-level widgets | ❌ | ✅ | ✅ | ✅ |

---

### Profile

| Permission | employee | manager | hr | admin |
|---|:---:|:---:|:---:|:---:|
| **Data scope** | `own` | `subordinates` | `all` | `all` |
| View own profile | ✅ | ✅ | ✅ | ✅ |
| View other employees' profiles | ❌ | ❌ | ✅ | ✅ |

> **Note:** Managers can see basic info in team views but have no dedicated profile page for subordinates. HR Officer can read all `hr.employee` records including personal and contract fields.

---

### Personal Notes

> Completely private to each user. Same access for all roles.

| Permission | employee | manager | hr | admin |
|---|:---:|:---:|:---:|:---:|
| Create / View / Delete own notes | ✅ | ✅ | ✅ | ✅ |

---

### Announcements

| Permission | employee | manager | hr | admin |
|---|:---:|:---:|:---:|:---:|
| View announcements | ✅ | ✅ | ✅ | ✅ |
| Create / publish announcements | ❌ | ❌ | ✅ | ✅ |

---

### Notifications

| Permission | employee | manager | hr | admin |
|---|:---:|:---:|:---:|:---:|
| View own notifications | ✅ | ✅ | ✅ | ✅ |

---

### Settings

| Permission | employee | manager | hr | admin |
|---|:---:|:---:|:---:|:---:|
| Toggle language (AR / EN) | ✅ | ✅ | ✅ | ✅ |
| Toggle dark mode | ✅ | ✅ | ✅ | ✅ |

---

### Chat HR

| Permission | employee | manager | hr | admin |
|---|:---:|:---:|:---:|:---:|
| Initiate / participate in HR chat | ✅ | ✅ | ✅ | ✅ |

---

## Approval Chains Summary

| Module | Step 1 | Step 2 | Step 3 |
|---|---|---|---|
| Leave | Manager | HR | — |
| Expense | Manager | HR / Accounting | — |
| Loan | Manager | HR | CEO (Admin) |
| Advance Salary | Manager | HR | — |
| HR Letter | — | HR | — |
| Document Request | — | HR | — |
| Experience Certificate | — | HR | — |
| Business Service | Manager | IT (external) | — |

---

## Quick Reference — Who Can Approve What

| Role | Can Approve |
|---|---|
| `employee` | Nothing — submits requests only |
| `manager` | Leave (1st), Expense (1st), Loan (Manager level), Advance Salary (1st), Business Service (1st) |
| `hr` | Leave (2nd/final), Expense (2nd/final), Loan (HR level), Advance Salary (2nd), HR Letters, Document Requests, Experience Certificates |
| `admin` | Everything — including CEO-level Loan approval |

---

## How to Test

### Mock Users

Four test accounts are pre-configured in `app/src/api/mocks/auth.mock.ts`. Each maps to a distinct role. The badge ID is simply the role name for easy recall:

| Role | Name | Badge ID | PIN |
|---|---|---|---|
| `employee` | Employee | `employee` | any (not `0000`) |
| `manager` | Manager | `manager` | any (not `0000`) |
| `hr` | HR | `hr` | any (not `0000`) |
| `admin` | Admin | `admin` | any (not `0000`) |

### Quick Login (DEV bar)

When `MOCK_MODE = true` (default in development), a **DEV — Quick Login** bar appears at the bottom of the Login screen with four color-coded buttons:

| Button | Color | Logs in as |
|---|---|---|
| Employee | Gray | Employee (`employee`) |
| Manager | Blue | Manager (`manager`) |
| HR | Green | HR (`hr`) |
| Admin | Red | Admin (`admin`) |

Tap any button to bypass the login form and jump straight into the app as that role. No badge ID or PIN required.

### Manual Login

You can also log in manually using the standard form. Type the role name as the badge ID (e.g. `manager`) with any PIN — except `0000` which returns an invalid credentials error.

### What to Verify Per Role

#### Employee (`EMP-0099`)
- Home services grid shows **no** My Team or Pending Approvals tiles
- More Hub shows **no** Analytics or Team Hours items
- Navigating directly to Pending Approvals, Team Balance, Analytics, or Team Hours shows the **🔒 Access Denied** screen
- Leave detail screen shows **no** Approve / Refuse buttons
- Profile subtitle shows `· Employee`

#### Manager (`EMP-0042`)
- Home grid shows **My Team** and **Pending Approvals** tiles
- More Hub shows **Team Hours**; **Analytics** is visible
- Pending Approvals screen loads with Leave, Expense, Loan, Advance Salary, Business Service tabs
- Leave detail screen shows **Approve** and **Refuse** buttons on pending requests
- Analytics screen loads with `subordinates` scope data
- Profile subtitle shows `· Manager`

#### HR (`HR-0001`)
- All manager screens accessible
- Pending Approvals includes HR Letters, Document Requests, Experience Certificates actions
- Leave detail shows both first and second-level approval actions
- Analytics loads with `all` scope (company-wide data)
- Profile subtitle shows `· Hr`

#### Admin (`ADM-001`)
- Full access to everything
- Pending Approvals shows all approval types including CEO-level Loan
- Analytics and Team Hours load with `all` scope
- Profile subtitle shows `· Admin`

### Testing Approval Flows

1. Log in as **Employee** → create a leave request → status becomes `pending`
2. Log out → log in as **Manager** → open Pending Approvals → approve the request
3. Log out → log in as **HR** → open Pending Approvals → validate (second-level) the request
4. Log back in as **Employee** → confirm leave status is now `approved`

### Implementation Files

| File | Role |
|---|---|
| `app/src/config/roleAccess.ts` | Single source of truth — all permissions per role |
| `app/src/hooks/useRBAC.ts` | Hook consumed by screens to read permissions |
| `app/src/components/common/AccessDenied.tsx` | Screen shown when role lacks access |
| `app/src/api/mocks/auth.mock.ts` | Mock user definitions and `mockLoginAs()` helper |
