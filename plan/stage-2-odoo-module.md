# Stage 2 — Odoo Custom Module

Build a custom Odoo addon that exposes all required HR data and actions
as a clean internal API layer. The Django middleware (Stage 3) will call
this module via Odoo's JSON-RPC / XML-RPC interface using a single service user.

This stage does not require the mobile app or Django to be running.
It is self-contained and testable directly inside Odoo.

---

## Milestone 1 (Module Scaffold)

- Task 1.1 — Create custom addon folder `ess_hr_mobile` inside Odoo addons path
- Task 1.2 — Write `__manifest__.py`: name, version, depends (`hr`, `hr_attendance`, `hr_leave`, `hr_payroll`, `hr_expense`, `project`, `account`)
- Task 1.3 — Create module folder structure:
  ```
  ess_hr_mobile/
  ├── __manifest__.py
  ├── __init__.py
  ├── models/
  ├── controllers/       # JSON-RPC controllers (if needed)
  ├── security/          # ir.model.access.csv
  ├── data/              # default data and config
  └── tests/
  ```
- Task 1.4 — Create service user account in Odoo for Django to authenticate with
- Task 1.5 — Define access rights in `ir.model.access.csv` for the service user on all required models
- Task 1.6 — Install and verify the empty module loads without errors

---

## Milestone 2 (License & Company Configuration)

- Task 2.1 — Create `ess.license` model: company, license key, tier (Basic/Standard/Premium), active, expiry date
- Task 2.2 — Create wizard or admin UI to generate and manage license keys inside Odoo
- Task 2.3 — Create method `validate_license_key(key)` callable via RPC: return company info or error
- Task 2.4 — Create method `get_companies_for_license(key)`: return list of companies linked to a license
- Task 2.5 — Write tests for license validation logic

---

## Milestone 3 (Authentication Support)

- Task 3.1 — Create method `authenticate_badge_pin(badge_id, pin, company_id)`: look up employee by badge, validate PIN hash, return employee info
- Task 3.2 — Add `mobile_pin` field to `hr.employee` (hashed, write-only from mobile)
- Task 3.3 — Create method `get_employee_by_odoo_user(odoo_uid)`: return employee linked to an Odoo user account (for username/password login)
- Task 3.4 — Create method `reset_mobile_pin(employee_id, new_pin)`: update PIN hash
- Task 3.5 — Write tests for authentication methods

---

## Milestone 4 (Employee Profile Data)

- Task 4.1 — Create method `get_employee_profile(employee_id)`: return all profile fields needed by the mobile app (name, photo, badge, department, job position, manager, DOB, nationality, phone, work email, hire date, contract type)
- Task 4.2 — Ensure photo is returned as base64 string
- Task 4.3 — Create method `get_contract_summary(employee_id)`: hiring date, contract type, wage type
- Task 4.4 — Write tests for profile data methods

---

## Milestone 5 (Attendance)

- Task 5.1 — Create method `check_in(employee_id, timestamp, latitude, longitude, task_id)`: create `hr.attendance` record
- Task 5.2 — Create method `check_out(employee_id, timestamp, latitude, longitude)`: update open `hr.attendance` record
- Task 5.3 — Add `gps_latitude` and `gps_longitude` fields to `hr.attendance`
- Task 5.4 — Create method `get_attendance_status(employee_id)`: return current check-in state and hours worked today
- Task 5.5 — Create method `get_attendance_history(employee_id, date_from, date_to)`: paginated list of attendance records
- Task 5.6 — Create method `get_daily_sheet(employee_id, date)`: all entries for a specific day with status codes
- Task 5.7 — Create method `get_monthly_sheet(employee_id, year, month)`: one record per calendar day with status (Present, Absent, Weekend, Holiday, On Leave)
- Task 5.8 — Write tests for attendance methods

---

## Milestone 6 (Leave Management)

- Task 6.1 — Create method `get_leave_types(company_id)`: return active leave types with per-type rules (requires attachment, requires description, allow half-day, allow hourly)
- Task 6.2 — Add fields to `hr.leave.type` if missing: `mobile_require_attachment`, `mobile_require_description`
- Task 6.3 — Create method `get_leave_balance(employee_id)`: allocated, used, pending per leave type
- Task 6.4 — Create method `create_leave_request(employee_id, leave_type_id, date_from, date_to, half_day, am_pm, description)`: create `hr.leave` in Draft
- Task 6.5 — Create method `get_leave_requests(employee_id, state_filter)`: list with approval history
- Task 6.6 — Create method `get_leave_request_detail(leave_id)`: full detail with approval trail
- Task 6.7 — Create method `approve_leave(leave_id, manager_employee_id)`: trigger Odoo approval workflow
- Task 6.8 — Create method `refuse_leave(leave_id, manager_employee_id, reason)`: refuse with reason
- Task 6.9 — Create method `validate_leave(leave_id, hr_employee_id)`: HR-level validation
- Task 6.10 — Create method `reset_leave_to_draft(leave_id)`: reset state
- Task 6.11 — Create method `get_team_leave_allocations(manager_employee_id)`: team members' balances
- Task 6.12 — Write tests for all leave methods

---

## Milestone 7 (Payslip)

- Task 7.1 — Create method `get_payslips(employee_id, year, month)`: list of payslips with status
- Task 7.2 — Create method `get_payslip_detail(payslip_id)`: earnings lines, deduction lines, net pay
- Task 7.3 — Create method `get_payslip_pdf(payslip_id)`: generate and return PDF as base64 using Odoo report engine
- Task 7.4 — Write tests for payslip methods

---

## Milestone 8 (Expense)

- Task 8.1 — Create method `get_expense_categories()`: product categories usable as expense types
- Task 8.2 — Create method `get_currencies()`: active currencies
- Task 8.3 — Create method `get_purchase_taxes(company_id)`: available purchase taxes
- Task 8.4 — Create method `create_expense(employee_id, product_id, amount, currency_id, tax_id, payment_mode, description, date)`: create `hr.expense`
- Task 8.5 — Create method `attach_file_to_expense(expense_id, filename, file_base64)`: add `ir.attachment` to the expense
- Task 8.6 — Create method `get_expenses(employee_id, state_filter)`: list
- Task 8.7 — Create method `update_expense(expense_id, fields)`: update draft expense
- Task 8.8 — Create method `delete_expense(expense_id)`: unlink draft expense
- Task 8.9 — Create method `submit_expense(expense_id)`: submit and auto-create expense report (`hr.expense.sheet`)
- Task 8.10 — Write tests for expense methods

---

## Milestone 9 (Loan Management)

- Task 9.1 — Identify or create the Odoo loan model (custom `hr.loan` if not present in installed modules)
- Task 9.2 — Create method `get_loan_rules(company_id)`: return configurable business rules
- Task 9.3 — Create method `create_loan(employee_id, amount, duration, transfer_method)`: validate rules server-side, create loan record
- Task 9.4 — Create method `get_loans(employee_id)`: list with status
- Task 9.5 — Create method `get_loan_detail(loan_id)`: detail + installment schedule
- Task 9.6 — Create method `approve_loan(loan_id, approver_employee_id)`: workflow action
- Task 9.7 — Create method `refuse_loan(loan_id, approver_employee_id, reason)`: refuse
- Task 9.8 — Write tests for loan methods

---

## Milestone 10 (Advance Salary)

- Task 10.1 — Identify or create `hr.advance.salary` model
- Task 10.2 — Create method `get_advance_salary_cap(employee_id)`: return 50% of basic wage from contract
- Task 10.3 — Create method `create_advance_salary(employee_id, amount)`: validate cap server-side
- Task 10.4 — Create method `get_advance_salaries(employee_id)`: list
- Task 10.5 — Create method `approve_advance_salary(request_id, manager_employee_id)`: approve
- Task 10.6 — Create method `refuse_advance_salary(request_id, manager_employee_id, reason)`: refuse
- Task 10.7 — Create method `reset_advance_salary(request_id)`: reset to draft
- Task 10.8 — Write tests

---

## Milestone 11 (HR Services — Letters, Documents, Certificates, Business Services)

- Task 11.1 — Identify or create models: `hr.letter.request`, `hr.document.request`, `hr.experience.certificate`, `hr.business.service.request`
- Task 11.2 — Create CRUD methods for HR Letters: `create`, `list`, `detail`, `update`, `delete`, `approve`, `refuse`, `reset`
- Task 11.3 — Create CRUD methods for Document Requests (same pattern)
- Task 11.4 — Create CRUD methods for Experience Certificates (same pattern)
- Task 11.5 — Create method `get_business_service_types(company_id)`: return configured service types
- Task 11.6 — Create CRUD methods for Business Service Requests (same pattern)
- Task 11.7 — Write tests for all HR service methods

---

## Milestone 12 (Tasks & Timesheets)

- Task 12.1 — Create method `get_tasks(employee_id)`: tasks assigned to the employee from `project.task` with project, stage, deadline, priority
- Task 12.2 — Create method `get_task_detail(task_id)`: full task detail
- Task 12.3 — Create method `update_task_stage(task_id, stage_id)`: write stage to Odoo
- Task 12.4 — Create method `log_timesheet(employee_id, task_id, date, hours, description)`: create `account.analytic.line`
- Task 12.5 — Create method `get_daily_timesheet(employee_id, date)`: all time logs for the day
- Task 12.6 — Create method `get_weekly_timesheet(employee_id, week_start)`: grouped by day with totals
- Task 12.7 — Create method `get_task_attachments(task_id)`: list `ir.attachment` records on the task
- Task 12.8 — Create method `add_task_attachment(task_id, filename, file_base64)`: add attachment
- Task 12.9 — Write tests for tasks and timesheet methods

---

## Milestone 13 (Module Testing & QA)

- Task 13.1 — Write unit tests for every RPC method using Odoo's test framework
- Task 13.2 — Test all methods via XML-RPC from a Python script (simulating Django connector calls)
- Task 13.3 — Verify access rights: service user can only access allowed models and records
- Task 13.4 — Test workflow state machines: leave, loan, advance salary, HR services — all state transitions
- Task 13.5 — Test with real employee data in a staging Odoo instance
- Task 13.6 — Document all RPC method signatures in a reference file for the Django team
