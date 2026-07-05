# Stage 3 — Django REST Framework Backend

Build the Django middleware server that sits between the mobile app and Odoo.
All mobile requests go through this layer. It authenticates, validates, transforms,
and forwards to Odoo via JSON-RPC/XML-RPC using a single service user account.

---

## Milestone 1 (Project Setup)

- Task 1.1 — Create Django project with DRF (`djangorestframework`)
- Task 1.2 — Configure PostgreSQL as the primary database
- Task 1.3 — Configure Redis (caching layer + Celery message broker)
- Task 1.4 — Set up Celery for background and scheduled jobs
- Task 1.5 — Configure environment variables with `python-decouple` or `django-environ` (DB, Redis, Odoo URL, JWT secret, FCM key)
- Task 1.6 — Set up project app structure:
  ```
  apps/
  ├── auth_app/         # JWT auth, license, company
  ├── odoo_connector/   # Odoo JSON-RPC client
  ├── attendance/
  ├── leave/
  ├── payslip/
  ├── expense/
  ├── loan/
  ├── advance_salary/
  ├── hr_letters/
  ├── document_requests/
  ├── experience_certs/
  ├── business_services/
  ├── tasks/
  ├── timesheets/
  ├── profile/
  └── notifications/
  ```
- Task 1.7 — Configure structured logging (JSON logs for production)
- Task 1.8 — API versioning: all routes under `/api/v1/`

---

## Milestone 2 (Odoo Connector)

- Task 2.1 — Create Odoo JSON-RPC client class (using `xmlrpc.client` or `requests`)
- Task 2.2 — Implement single service user authentication with Odoo (uid + password stored in env)
- Task 2.3 — Implement connection retry logic with exponential backoff
- Task 2.4 — Create utility methods: `search_read`, `create`, `write`, `unlink`, `call_method`
- Task 2.5 — Create response mapping utilities: Odoo fields → Django API field names
- Task 2.6 — Create error mapping: Odoo exceptions → standardized API error codes
- Task 2.7 — Add Redis caching layer for Odoo read calls (configurable TTL per model)

---

## Milestone 3 (License & Company System)

- Task 3.1 — `License` model: key, company name, tier (Basic/Standard/Premium), active flag, expiry
- Task 3.2 — `POST /api/v1/license/activate/`: validate key, return company list
- Task 3.3 — `GET /api/v1/companies/`: list companies linked to a validated license
- Task 3.4 — License tier enforcement middleware: block endpoints above the licensed tier
- Task 3.5 — Admin panel for license management (Django admin)

---

## Milestone 4 (Authentication)

- Task 4.1 — `POST /api/v1/auth/login/badge/`: Badge ID + PIN → validate against Odoo employee record → return JWT
- Task 4.2 — `POST /api/v1/auth/login/password/`: Username + Password → validate against Odoo user → return JWT
- Task 4.3 — JWT token generation: access token (short-lived) + refresh token (long-lived), RS256 signing
- Task 4.4 — `POST /api/v1/auth/token/refresh/`: exchange refresh token for new access token
- Task 4.5 — Single-device enforcement: store active device token per employee, invalidate old token on new login
- Task 4.6 — `POST /api/v1/auth/password-reset/request/`: send reset code via email
- Task 4.7 — `POST /api/v1/auth/password-reset/confirm/`: verify code and update password
- Task 4.8 — `POST /api/v1/auth/logout/`: invalidate refresh token and deregister device

---

## Milestone 5 (Employee Profile & Dashboard)

- Task 5.1 — `GET /api/v1/profile/`: return employee info from Odoo `hr.employee` (name, photo, badge, department, position, manager, DOB, nationality, phone, email, hire date, contract type)
- Task 5.2 — `GET /api/v1/dashboard/attendance-status/`: current check-in status and hours worked today
- Task 5.3 — `GET /api/v1/dashboard/leave-balances/`: top leave types with allocated, used, pending
- Task 5.4 — `GET /api/v1/dashboard/pending-approvals/`: count of requests pending the logged-in manager
- Task 5.5 — `GET /api/v1/dashboard/recent-requests/`: last 10 requests across all modules for the employee

---

## Milestone 6 (Attendance Endpoints)

- Task 6.1 — `POST /api/v1/attendance/check-in/`: write to Odoo `hr.attendance` with GPS lat/lng, timestamp, task/project
- Task 6.2 — `POST /api/v1/attendance/check-out/`: update Odoo `hr.attendance` record with check-out time and GPS
- Task 6.3 — `GET /api/v1/attendance/history/`: list with date range filter, paginated
- Task 6.4 — `GET /api/v1/attendance/sheet/daily/?date=YYYY-MM-DD`: daily sheet for employee
- Task 6.5 — `GET /api/v1/attendance/sheet/monthly/?month=YYYY-MM`: monthly sheet with status per day

---

## Milestone 7 (Leave Endpoints)

- Task 7.1 — `GET /api/v1/leave/types/`: list active leave types from Odoo with per-type rules (requires attachment, requires description)
- Task 7.2 — `GET /api/v1/leave/balance/`: leave balance per type for the employee
- Task 7.3 — `POST /api/v1/leave/requests/`: create leave request in Odoo `hr.leave`
- Task 7.4 — `GET /api/v1/leave/requests/`: list employee's leave requests, filterable by status
- Task 7.5 — `GET /api/v1/leave/requests/{id}/`: detail with approval history
- Task 7.6 — `POST /api/v1/leave/requests/{id}/approve/`: manager approve (Odoo workflow)
- Task 7.7 — `POST /api/v1/leave/requests/{id}/refuse/`: manager refuse with reason
- Task 7.8 — `POST /api/v1/leave/requests/{id}/validate/`: HR validate
- Task 7.9 — `POST /api/v1/leave/requests/{id}/reset/`: reset to draft
- Task 7.10 — `GET /api/v1/leave/team-allocations/`: team members' leave balances (manager only)
- Task 7.11 — `POST /api/v1/leave/requests/{id}/attachment/`: upload attachment file

---

## Milestone 8 (Payslip Endpoints)

- Task 8.1 — `GET /api/v1/payslip/`: list payslips for employee with month/year filter
- Task 8.2 — `GET /api/v1/payslip/{id}/`: payslip detail — earnings lines, deduction lines, net pay
- Task 8.3 — `GET /api/v1/payslip/{id}/pdf/`: generate and return PDF (use Odoo report or wkhtmltopdf)

---

## Milestone 9 (Expense Endpoints)

- Task 9.1 — `GET /api/v1/expense/categories/`: expense categories from Odoo
- Task 9.2 — `GET /api/v1/expense/currencies/`: currency list
- Task 9.3 — `GET /api/v1/expense/taxes/`: purchase tax list from Odoo
- Task 9.4 — `POST /api/v1/expense/`: create expense in Odoo `hr.expense` with file upload (multipart)
- Task 9.5 — `GET /api/v1/expense/`: list employee's expenses
- Task 9.6 — `PUT /api/v1/expense/{id}/`: update draft expense
- Task 9.7 — `DELETE /api/v1/expense/{id}/`: delete draft expense
- Task 9.8 — `POST /api/v1/expense/{id}/submit/`: submit expense → auto-create expense report in Odoo

---

## Milestone 10 (Loan Endpoints)

- Task 10.1 — `GET /api/v1/loan/rules/`: return company loan rules (min hiring period, max duration, min gap, max amount from contract)
- Task 10.2 — `POST /api/v1/loan/`: create loan application in Odoo, server-side rule validation
- Task 10.3 — `GET /api/v1/loan/`: list employee's loans
- Task 10.4 — `GET /api/v1/loan/{id}/`: loan detail with installment schedule
- Task 10.5 — `POST /api/v1/loan/{id}/approve/`: manager approve
- Task 10.6 — `POST /api/v1/loan/{id}/refuse/`: manager/HR refuse
- Task 10.7 — `POST /api/v1/loan/{id}/validate/`: HR validate → CEO → final approval

---

## Milestone 11 (Advance Salary Endpoints)

- Task 11.1 — `GET /api/v1/advance-salary/cap/`: return employee's 50% basic salary cap amount
- Task 11.2 — `POST /api/v1/advance-salary/`: create advance salary request, validate cap server-side
- Task 11.3 — `GET /api/v1/advance-salary/`: list employee's advance salary requests
- Task 11.4 — `GET /api/v1/advance-salary/{id}/`: request detail
- Task 11.5 — `POST /api/v1/advance-salary/{id}/approve/`: manager approve
- Task 11.6 — `POST /api/v1/advance-salary/{id}/refuse/`: manager refuse
- Task 11.7 — `POST /api/v1/advance-salary/{id}/reset/`: reset to draft
- Task 11.8 — `DELETE /api/v1/advance-salary/{id}/`: delete draft

---

## Milestone 12 (HR Services Endpoints)

Each HR service module (HR Letters, Document Requests, Experience Certificates, Business Services)
follows the same CRUD + workflow pattern.

- Task 12.1 — `POST /GET /PUT /DELETE /api/v1/hr-letters/`: full CRUD for HR letter requests
- Task 12.2 — `POST /GET /PUT /DELETE /api/v1/document-requests/`: full CRUD for document requests
- Task 12.3 — `POST /GET /PUT /DELETE /api/v1/experience-certs/`: full CRUD for experience certificates
- Task 12.4 — `GET /api/v1/business-services/types/`: dynamic service types from Odoo configuration
- Task 12.5 — `POST /GET /PUT /DELETE /api/v1/business-services/`: full CRUD for business service requests
- Task 12.6 — Shared approval/refuse/reset endpoints for all four modules (reusable DRF mixin)

---

## Milestone 13 (Tasks & Timesheets Endpoints)

- Task 13.1 — `GET /api/v1/tasks/`: tasks assigned to employee from Odoo `project.task` (with project, stage, deadline, priority)
- Task 13.2 — `GET /api/v1/tasks/{id}/`: task detail
- Task 13.3 — `PUT /api/v1/tasks/{id}/stage/`: update task stage in Odoo
- Task 13.4 — `POST /api/v1/timesheets/`: create time log in Odoo `account.analytic.line`
- Task 13.5 — `GET /api/v1/timesheets/daily/?date=YYYY-MM-DD`: daily timesheet for employee
- Task 13.6 — `GET /api/v1/timesheets/weekly/?week=YYYY-WNN`: weekly timesheet with totals
- Task 13.7 — `GET /api/v1/tasks/{id}/attachments/`: list task attachments from Odoo
- Task 13.8 — `POST /api/v1/tasks/{id}/attachments/`: upload attachment to Odoo task

---

## Milestone 14 (Push Notifications)

- Task 14.1 — `POST /api/v1/devices/register/`: store FCM/APNs device token linked to employee
- Task 14.2 — `DELETE /api/v1/devices/deregister/`: remove device token on logout
- Task 14.3 — Celery task: on any approval state change (leave, loan, expense, etc.) → send FCM/APNs push to employee
- Task 14.4 — Celery task: send push to manager when new request requires approval
- Task 14.5 — `POST /api/v1/announcements/`: HR sends company-wide announcement (push + in-app)
- Task 14.6 — `DeviceNotificationLog` model: track sent/failed push messages for debugging

---

## Milestone 15 (Background Jobs & Sync)

- Task 15.1 — Celery beat: periodic sync of leave types and balances from Odoo to Redis cache (every hour)
- Task 15.2 — Celery beat: periodic sync of employee profiles from Odoo (every day)
- Task 15.3 — `POST /api/v1/sync/flush/`: accept batch of offline queued actions from mobile, process sequentially
- Task 15.4 — Conflict resolution logic in flush endpoint: compare timestamps, server wins on conflict, return conflict details to client
- Task 15.5 — Redis cache invalidation: clear relevant cache keys on any write operation
- Task 15.6 — `GET /api/v1/sync/status/`: return server timestamp for clock sync with mobile

---

## Milestone 16 (Security & Production Readiness)

- Task 16.1 — Rate limiting on auth endpoints (login, password reset): `django-ratelimit`
- Task 16.2 — CORS configuration: allow only the mobile app's registered origins
- Task 16.3 — HTTPS enforcement and HSTS headers
- Task 16.4 — Input validation and sanitization on all endpoints using DRF serializers
- Task 16.5 — Audit trail model: log every write action (who, what, when, from which IP)
- Task 16.6 — `GET /api/v1/health/`: health check endpoint (DB, Redis, Odoo connectivity status)
- Task 16.7 — Dockerize: `Dockerfile` for Django app + `docker-compose.yml` for local dev (Django + PostgreSQL + Redis + Celery)
- Task 16.8 — Write automated tests for all endpoints (DRF `APITestCase`) with Odoo connector mocked
- Task 16.9 — CI pipeline: lint (flake8/ruff), tests, Docker build on every push
