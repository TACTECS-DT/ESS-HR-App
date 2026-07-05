# Comprehensive ESS Analysis Report
# Your Odoo Portal Modules vs. Competitor (Office Buddy)
---
**Date:** 2026-03-30 (updated from 2026-03-10)
**Purpose:** Full feature audit for mobile app replacement planning
**Languages:** Arabic & English wireframes planned

---

## TABLE OF CONTENTS

1. [Your Current Solution - Module Overview](#1-your-current-solution)
2. [Detailed Feature Inventory (Your Modules)](#2-detailed-feature-inventory)
3. [Competitor Analysis (Office Buddy)](#3-competitor-analysis)
4. [Feature-by-Feature Comparison](#4-feature-comparison)
5. [Gaps & Opportunities](#5-gaps-and-opportunities)
6. [Mobile App Planning Recommendations](#6-mobile-app-recommendations)

---

## 1. YOUR CURRENT SOLUTION - MODULE OVERVIEW

Your ESS solution consists of **12 custom Odoo 18 modules** providing a complete portal-based Employee Self Service. Employees access via Odoo Portal (no backend user license needed).

| # | Module | Purpose |
|---|--------|---------|
| 1 | employee_self_service_portal | Core ESS: Advance Salary, HR Letters, Document Requests, Experience Certificates, Business Services |
| 2 | tactecs_custom_portal | Portal framework: header, footer, navigation, authentication shell |
| 3 | tactecs_attendance_portal | Employee attendance check-in/check-out |
| 4 | tactecs_attendance_sheet_portal | Daily/Monthly attendance sheet review |
| 5 | tactecs_leaves_portal | Leave request management with multi-level approval |
| 6 | tactecs_leaves_manager_allocations_portal | Manager view of team leave allocations |
| 7 | tactecs_loan_portal | Employee loan applications |
| 8 | tactecs_expense_portal | Expense report submission & management |
| 9 | tactecs_payslip_portal | Payslip viewing & PDF printing |
| 10 | create_task_portal_customer | Customer task creation from portal |
| 11 | portal_templates | Shared UI templates (legacy) |

---

## 2. DETAILED FEATURE INVENTORY (YOUR MODULES)

### 2.1 ADVANCE SALARY REQUESTS

**Data Fields:**
- Name (title/reference)
- Reason (text description)
- Requested Amount
- Request Date
- Employee (auto-linked)
- State (workflow status)

**Workflow States:** Draft -> Submitted -> Approved/Refused -> Resubmitted

**Business Rules:**
- Maximum allowed amount = 50% of employee's basic salary (from contract)
- Employee can resubmit after refusal
- Employee can delete draft records only

**Portal Routes:**
- List view with filters (all, draft, my_advance_salaries)
- Detail/form view with previous/next navigation
- Create new request form
- Update existing request

**Role-Based Access:**
- Employee: own records only
- Manager: own + subordinates (via parent_id)
- All Access: all records (via admin flag)

---

### 2.2 HR LETTER REQUESTS

**Data Fields:**
- Name (reference)
- Directed To (recipient)
- Required Date
- Required Issue (reason/purpose)
- Salary Type (Net or Gross) - Selection field
- Employee (auto-linked)

**Workflow States:** Draft -> Submitted -> Approved/Refused -> Resubmitted

**Portal Routes:** Same CRUD pattern (list, detail, create, update)

---

### 2.3 DOCUMENT REQUESTS

**Data Fields:**
- Name (reference)
- Reason (text)
- Type of Document (selection)
- Return Date
- Employee (auto-linked)

**Workflow States:** Draft -> Submitted -> Approved/Refused -> Resubmitted

**Portal Routes:** Same CRUD pattern

---

### 2.4 EXPERIENCE CERTIFICATE REQUESTS

**Data Fields:**
- Name (reference)
- Directed To (recipient)
- Required Date
- Required Issue (purpose)
- Employee (auto-linked)

**Workflow States:** Draft -> Submitted -> Approved/Refused -> Resubmitted

**Portal Routes:** Same CRUD pattern

---

### 2.5 BUSINESS SERVICE REQUESTS

**Data Fields:**
- Name (reference)
- Type of Service (dynamic selection field)
- Reason (text)
- Wanted Date
- Employee (auto-linked)

**Workflow States:** Draft -> Submitted -> Approved/Refused -> Resubmitted

**Portal Routes:** Same CRUD pattern

---

### 2.6 ATTENDANCE MANAGEMENT

**Check-in/Check-out Features:**
- Single-action check-in and check-out
- Automatic timestamp recording
- Timezone adjustment (+2/+3 hours with daylight saving awareness)
- Task assignment integration (link attendance to project tasks)
- Google Maps/Geolocation integration (geocoding via external APIs)

**Attendance Sheets:**
- Daily and monthly attendance sheet views
- Line-by-line status per day:
  - 'ab' = Absence
  - 'weekend' = Weekend
  - 'ph' = Public Holiday
  - 'leave' = Leave
- Attachment support for documentation
- Previous/next sheet navigation
- States: Draft -> Confirmed -> Done

**Access Control:**
- attendance_manager_id field on hr.employee (dedicated attendance manager)
- attendance_portal_access_all flag
- attendance_sheet_access_all flag

**Portal Routes:**
- GET /my/attendance - List attendance records
- GET /my/attendance/new - Create attendance (check-in/out)
- GET /my/attendance_sheets - List sheets
- GET /my/attendance_sheets/<id> - View sheet detail

---

### 2.7 LEAVE MANAGEMENT

**Leave Request Features:**
- Full-day, half-day, and hourly leave requests
- Half-day: morning/afternoon selection
- Hourly: time range selection (from/to)
- Multiple leave types with individual configuration
- Mandatory attachment support per leave type
- Description requirement configurable per leave type
- File attachment upload support

**Leave Balance System:**
- Real-time balance calculation per leave type
- Formula: Virtual Remaining = Allocated - Used - Pending
- Supports both allocated and no-limit leave types
- Shows: remaining days, max leaves, request unit type

**Workflow States:** Draft -> Confirm (Waiting Manager Approval) -> Validate1 (Second HR Approval) -> Validate (Approved) / Refuse

**Manager Capabilities:**
- View all subordinate leave requests
- Approve leave requests (action_leave_approve)
- Validate leave requests - second level (action_leave_validate)
- Refuse leave requests (action_leave_refuse)
- Reset to draft (action_leave_draft)
- Custom approval email notifications

**Manager Allocations View (Separate Module):**
- Dashboard showing all team members' leave balances
- Per-employee breakdown: leave type, remaining days, max allocation
- Read-only overview for workforce planning

**Access Control:**
- leaves_portal_access_all flag
- time_off_officer_portal flag (time off approval officer)
- Default filter preference per employee (confirm, validate1, myleaves)

**Portal Routes:**
- GET /my/leaves - List with filters
- GET /my/leaves/<id> - Detail view
- POST /my/leaves/<id> - Update
- GET /my/leaves/new - Create form
- POST /my/leaves/new - Submit
- GET /my/leaves/invalid - Validation error page
- GET /my/allocations - Manager allocations dashboard

---

### 2.8 LOAN MANAGEMENT

**Data Fields:**
- Name (reference)
- Estimated Date
- Payment Date
- Payment End Date
- Loan Amount
- Installment Amount
- Loan Reason (text)
- Loan Transfer Method (selection - how funds transferred)

**Workflow States:** Draft -> Waiting Approval 1 -> Manager Approved -> HR Approved -> CEO Approved -> Approved / Refused / Canceled

**Business Rules:**
- Minimum hiring period check (configurable - employee must work X months before requesting)
- Maximum loan duration (configurable months limit)
- Duration between loans enforcement (configurable gap between loans)
- Maximum loan amount from employee contract (contract_id.max_loan_amount)
- Validation: checks hiring period + gap since last loan before allowing creation

**Portal Routes:** Same CRUD pattern (list, detail, create, update)

---

### 2.9 EXPENSE MANAGEMENT

**Data Fields:**
- Name (description)
- Date
- Product/Category (product.product where can_be_expensed=True)
- Total Amount
- Currency (multi-currency support)
- Quantity
- Tax IDs (multiple purchase taxes)
- Payment Mode (selection dropdown)
- Description (detailed text)
- Attachments (multiple file upload)

**Features:**
- Multi-currency expense submission
- Tax calculation on expense lines
- Payment mode selection
- File attachment with deduplication (checks existing by name)
- Automatic expense report creation on submit (action_create_report)
- Company-context filtering for taxes

**Access Control:**
- expense_manager_id on hr.employee
- expense_portal_access_all flag

**Portal Routes:** Same CRUD pattern

---

### 2.10 PAYSLIP MANAGEMENT

**Features:**
- View payslip list with filters (all, draft, my payslips)
- Detailed payslip breakdown view
- PDF report generation and printing (action_print_payslip)
- Previous/next payslip navigation
- Company context preserved

**Payslip States:** Draft -> Waiting -> Done -> Paid -> Rejected

**Extended Employee Data Available:**
- Personal: marital status, birthday, place of birth, country of birth, children count
- Address: private street, city, state, zip, country
- Contact: private phone, private email
- Spouse: name, birthdate
- Documents: SSN, insurance number, ID number, passport
- Work Permit: permit number, visa number, expiration dates, permit file
- Banking: bank account reference
- Contract: first contract date, current contract

**Portal Routes:**
- GET /my/payslip - List payslips
- GET /my/payslip/<id> - Detail view + print

---

### 2.11 PORTAL TASK CREATION (Customer)

**Features:**
- Portal customers can create project tasks
- Auto-discovers projects where user is a message partner
- Task fields: name, project, deadline, description
- Multiple file attachment support (converts to base64)
- Posts message to task with attachment list

**Portal Routes:**
- GET /my/create_new_task/custom/ - Task creation form
- POST /my/project_submit_task/ - Submit with attachments

---

### 2.12 SECURITY & ACCESS CONTROL SYSTEM

**Portal Access Flags (per module on res.users):**

| Flag | Controls |
|------|----------|
| employee_self_service_access_all | All ESS sub-modules |
| advance_salaries_portal_access_all | Advance salaries |
| hr_letter_access_all | HR letters |
| document_request_access_all | Document requests |
| business_services_access_all | Business services |
| experience_certification_access_all | Experience certificates |
| attendance_portal_access_all | Attendance records |
| attendance_sheet_access_all | Attendance sheets |
| leaves_portal_access_all | Leave requests |
| expense_portal_access_all | Expenses |
| loan_portal_access_all | Loans |
| payslip_portal_access_all | Payslips |

**Role Determination Logic (consistent across all modules):**
```
IF user has access_all flag -> Role: ALL (see everything)
ELSE IF user has subordinates (parent_id/coach_id) -> Role: MANAGER (own + team)
ELSE -> Role: EMPLOYEE (own records only)
```

**Domain Filtering:**
- Employee: [('employee_id', '=', current_user)]
- Manager: [employee_id in subordinates OR employee_id = current_user]
- All: [] (no filter)

---

### 2.13 TOTAL API ROUTES SUMMARY

| Module | Routes | Methods |
|--------|--------|---------|
| Core Portal (dashboard, user info, 404, access denied) | 4 | GET |
| Advance Salary | 5 | GET, POST |
| HR Letter | 5 | GET, POST |
| Document Request | 5 | GET, POST |
| Experience Certificate | 5 | GET, POST |
| Business Services | 5 | GET, POST |
| Attendance | 2 | GET |
| Attendance Sheet | 2 | GET |
| Leaves | 5 | GET, POST |
| Allocations | 1 | GET |
| Expense | 5 | GET, POST |
| Loan | 5 | GET, POST |
| Payslip | 2 | GET |
| Task Creation | 2 | GET, POST |
| **TOTAL** | **53+** | |

---

### 2.14 FRONTEND JAVASCRIPT ACTIONS

| Module | JS Files | Actions |
|--------|----------|---------|
| ESS Core | 5 files | Form interactions, AJAX submissions for all 5 request types |
| Attendance | 1 file | Check-in/out form handling |
| Leaves | 7 files | Delete, approve, validate, draft, confirm, refuse, custom approve |
| Expense | 1 file | Expense report creation |
| Loan | 1 file | Loan submission |
| Payslip | 1 file | Report printing |

---

## 3. COMPETITOR ANALYSIS: OFFICE BUDDY

**Developer:** Technaureus Info Solutions Pvt. Ltd. (Kerala, India)
**Platform:** iOS + Android native mobile app
**Target:** Odoo Community & Enterprise users, especially MENA region

### 3.1 COMPETITOR FEATURE SET

#### ATTENDANCE & TIME MANAGEMENT
- One-tap check-in/check-out on home screen
- GPS location capture with every attendance punch
- **Facial Recognition attendance** (prevents buddy punching)
- **Geofencing** (configurable radius per work location, e.g., 200m)
- **Passcode authentication** (backup for face recognition)
- **Multi-layer security**: Face + Geofence + Passcode all must pass
- Real-time total hours worked display
- Detailed attendance history with date range filtering
- **Personalized calendar view** (color-coded: leaves, absences, holidays, late arrivals)
- Work schedule viewing in profile
- **Check-in/check-out reminders** (local push notifications)

#### LEAVE MANAGEMENT
- Real-time leave balance with color-coded progress bars on home screen
- Leave request submission (type, dates, description)
- Automatic routing to manager
- Status tracking (To Approve -> Approved/Refused)
- Push notifications on manager decision
- **Leave allocation requests** (request additional leave days)
- Approved allocations auto-update balance

#### FINANCIAL
- Payslip detailed breakdown (earnings + deductions)
- Date range filtering for payslips
- **Download payslip as PDF to device**
- **Share payslip via email, WhatsApp, other apps**
- Expense claims with receipt photo attachment
- Pre-defined expense categories
- Draft state for editing before submission

#### EMPLOYEE PROFILE & ENGAGEMENT
- Read-only profile (personal, work info, resume, private info, schedule)
- **Personal notes/notepad** (create, view, delete, monthly filter)
- **Daily mood tracking** (emoji selection on first check-in, anonymized insights)
- **Company announcements** (HR posts from backend, push notifications)
- **HR Chat ("Talk with HR")** - direct messaging channel

#### MANAGER FEATURES
- **"My Team" dashboard** (real-time team attendance status)
- Approve/Reject time-off requests in-app
- Approve/Reject leave allocation requests
- Approve/Reject expense claims
- Instant notification to employee on decision

#### AUTHENTICATION & LICENSING
- Username + Password login (standard Odoo credentials)
- **Badge ID + PIN login** (for non-Odoo-licensed employees)
- **Biometric login** (fingerprint/Face ID for device unlock)
- **License key activation** (company-specific key on first launch)
- Single shared API user for all badge-based employees (cost savings)

#### PLATFORM & LOCALIZATION
- iOS App Store + Google Play
- Odoo Community & Enterprise compatible
- **100+ languages supported**
- **Full RTL (Right-to-Left) support for Arabic**
- **Multi-company support** (switch companies from dropdown)
- **Dark mode**
- App tour/onboarding guide
- Haptic feedback

---

## 4. FEATURE-BY-FEATURE COMPARISON

### Legend:
- [Y] = Yes, fully supported
- [P] = Partially supported
- [N] = Not supported
- [B] = Better implementation (highlighted advantage)

---

### 4.1 ATTENDANCE

| Feature | Your Solution | Office Buddy | Winner |
|---------|--------------|--------------|--------|
| Basic check-in/check-out | [Y] | [Y] | Tie |
| GPS location capture | [Y] (Google Maps API) | [Y] | Tie |
| Facial recognition | [N] | [B] Yes | Office Buddy |
| Geofencing | [N] | [B] Yes (configurable radius) | Office Buddy |
| Passcode verification | [N] | [B] Yes | Office Buddy |
| Task-linked attendance | [B] Yes (project tasks) | [N] | Your Solution |
| Attendance sheets (daily/monthly) | [B] Yes | [N] | Your Solution |
| Sheet line statuses (absence, weekend, holiday, leave) | [B] Yes | [N] | Your Solution |
| Timezone adjustment (DST) | [Y] | Not documented | Your Solution |
| Calendar view (color-coded) | [N] | [B] Yes | Office Buddy |
| Check-in reminders | [N] | [B] Yes (push notifications) | Office Buddy |
| Work schedule viewing | [N] | [Y] | Office Buddy |
| Total hours worked display | [N] | [Y] | Office Buddy |
| Attendance manager assignment | [Y] | Not documented | Your Solution |
| Date range filtering | [P] (basic filters) | [Y] | Office Buddy |

---

### 4.2 LEAVE MANAGEMENT

| Feature | Your Solution | Office Buddy | Winner |
|---------|--------------|--------------|--------|
| Full-day leave requests | [Y] | [Y] | Tie |
| Half-day leave (AM/PM) | [B] Yes | Not documented | Your Solution |
| Hourly leave requests | [B] Yes | Not documented | Your Solution |
| Leave balance display | [Y] | [Y] (color-coded bars on home) | Office Buddy (UX) |
| Mandatory attachment per type | [B] Yes | Not documented | Your Solution |
| Description required per type | [B] Yes | [P] | Your Solution |
| Multi-level approval (Manager + HR) | [B] Yes (2 levels) | [P] (Manager only documented) | Your Solution |
| Manager approve/refuse | [Y] | [Y] | Tie |
| Leave allocation requests | [N] | [B] Yes | Office Buddy |
| Manager team allocations dashboard | [B] Yes | [P] | Your Solution |
| Default filter preference | [Y] | [N] | Your Solution |
| Push notifications on decision | [N] (email only) | [B] Yes | Office Buddy |
| Custom approval emails | [Y] | Not documented | Your Solution |
| Resubmit after refusal | [B] Yes | Not documented | Your Solution |

---

### 4.3 FINANCIAL - PAYSLIP

| Feature | Your Solution | Office Buddy | Winner |
|---------|--------------|--------------|--------|
| View payslip details | [Y] | [Y] | Tie |
| Generate PDF report | [Y] | [Y] | Tie |
| Download to device | [P] (browser-based) | [B] Yes (native download) | Office Buddy |
| Share via WhatsApp/email | [N] | [B] Yes | Office Buddy |
| Date range filter | [P] (basic) | [Y] | Office Buddy |
| Previous/next navigation | [B] Yes | Not documented | Your Solution |

---

### 4.4 FINANCIAL - EXPENSES

| Feature | Your Solution | Office Buddy | Winner |
|---------|--------------|--------------|--------|
| Create expense claims | [Y] | [Y] | Tie |
| Multi-currency support | [B] Yes | Not documented | Your Solution |
| Tax calculation | [B] Yes | Not documented | Your Solution |
| Multiple payment modes | [B] Yes | [Y] | Your Solution |
| Receipt photo attachment | [Y] | [Y] | Tie |
| Multiple file attachments | [B] Yes | Not documented | Your Solution |
| Expense report auto-creation | [B] Yes | Not documented | Your Solution |
| Draft editing before submit | [Y] | [Y] | Tie |
| Pre-defined categories | [Y] | [Y] | Tie |
| Attachment deduplication | [B] Yes | Not documented | Your Solution |

---

### 4.5 FINANCIAL - LOANS

| Feature | Your Solution | Office Buddy | Winner |
|---------|--------------|--------------|--------|
| Loan applications | [B] Yes | [N] Not available | Your Solution |
| Multi-level approval (Manager/HR/CEO) | [B] Yes | N/A | Your Solution |
| Minimum hiring period validation | [B] Yes | N/A | Your Solution |
| Loan duration limits | [B] Yes | N/A | Your Solution |
| Duration between loans enforcement | [B] Yes | N/A | Your Solution |
| Max amount from contract | [B] Yes | N/A | Your Solution |
| Transfer method selection | [B] Yes | N/A | Your Solution |

---

### 4.6 FINANCIAL - ADVANCE SALARY

| Feature | Your Solution | Office Buddy | Winner |
|---------|--------------|--------------|--------|
| Advance salary requests | [B] Yes | [N] Not available | Your Solution |
| Max 50% of basic salary rule | [B] Yes | N/A | Your Solution |
| Approval workflow | [B] Yes | N/A | Your Solution |

---

### 4.7 HR SERVICES (Letters, Documents, Certificates)

| Feature | Your Solution | Office Buddy | Winner |
|---------|--------------|--------------|--------|
| HR Letter requests | [B] Yes | [N] | Your Solution |
| Document requests | [B] Yes | [N] | Your Solution |
| Experience certificate requests | [B] Yes | [N] | Your Solution |
| Business service requests | [B] Yes | [N] | Your Solution |
| Net/Gross salary type selection | [B] Yes | N/A | Your Solution |

---

### 4.8 EMPLOYEE PROFILE & ENGAGEMENT

| Feature | Your Solution | Office Buddy | Winner |
|---------|--------------|--------------|--------|
| Employee profile viewing | [Y] (via user-info) | [Y] (detailed sections) | Tie |
| Personal notes | [N] | [B] Yes | Office Buddy |
| Daily mood tracking | [N] | [B] Yes | Office Buddy |
| Company announcements | [N] | [B] Yes | Office Buddy |
| HR Chat support | [N] | [B] Yes | Office Buddy |

---

### 4.9 AUTHENTICATION & LICENSING

| Feature | Your Solution | Office Buddy | Winner |
|---------|--------------|--------------|--------|
| Portal-based access (no license) | [Y] | [Y] (Badge ID approach) | Tie |
| Username/Password | [Y] | [Y] | Tie |
| Badge ID + PIN | [B] Yes (implemented) | [B] Yes | Tie |
| Biometric login (Fingerprint/FaceID) | [N] | [B] Yes | Office Buddy |
| Server URL-based activation (no key exposed to user) | [B] Yes (new arch) | [N] | Your Solution |
| Two-step login (Admin validates → Client authenticates) | [B] Yes (new arch) | [N] | Your Solution |
| Admin-controlled module visibility per license | [B] Yes (new arch) | [N] | Your Solution |
| Configurable auto-logout duration per server | [B] Yes (new arch) | [N] | Your Solution |

---

### 4.10 PLATFORM & UX

| Feature | Your Solution | Office Buddy | Winner |
|---------|--------------|--------------|--------|
| Mobile-native app | [N] (web portal only) | [B] Yes (iOS + Android) | Office Buddy |
| Arabic RTL support | [P] (if Odoo configured) | [B] Yes (native) | Office Buddy |
| 100+ languages | [P] (Odoo translations) | [B] Yes | Office Buddy |
| Dark mode | [N] | [B] Yes | Office Buddy |
| Multi-company support | [P] (Odoo native) | [B] Yes (in-app switcher) | Office Buddy |
| Push notifications | [N] | [B] Yes | Office Buddy |
| Offline capability | [N] | [N] | Tie (both lack it) |
| Onboarding/app tour | [N] | [B] Yes | Office Buddy |

---

### 4.11 MANAGER FEATURES

| Feature | Your Solution | Office Buddy | Winner |
|---------|--------------|--------------|--------|
| Team overview dashboard | [P] (allocations only) | [B] Yes (real-time attendance status) | Office Buddy |
| Approve leave requests | [Y] | [Y] | Tie |
| Approve expense claims | [Y] | [Y] | Tie |
| Multi-level approval chains | [B] Yes (Manager + HR + CEO for loans) | [P] (Manager only) | Your Solution |
| Subordinate filtering | [Y] (parent_id, coach_id) | [Y] | Tie |

---

## 5. GAPS & OPPORTUNITIES

### 5.1 FEATURES YOU HAVE THAT COMPETITOR LACKS

These are your **competitive advantages** - must be preserved in the mobile app:

1. **Loan Management** - Complete loan lifecycle with multi-level approval, business rules (hiring period, duration limits, gap enforcement), max amount from contract
2. **Advance Salary Requests** - With 50% basic salary cap validation
3. **HR Letter Requests** - With Net/Gross salary type selection
4. **Document Requests** - With type categorization and return dates
5. **Experience Certificate Requests** - Formal certificate workflow
6. **Business Service Requests** - Dynamic service type selection
7. **Attendance Sheets** - Detailed daily/monthly sheets with line-by-line status codes
8. **Task-Linked Attendance** - Connect attendance to project tasks
9. **Multi-Level Approval** - Up to 4 levels (Manager -> HR -> CEO) for loans
10. **Hourly Leave Requests** - Time-range based leave
11. **Half-Day Leave** - AM/PM selection
12. **Mandatory Attachment Per Leave Type** - Configurable requirement
13. **Multi-Currency Expenses** - With tax calculation
14. **Expense Report Auto-Creation** - One-click report generation
15. **Resubmit After Refusal** - All request types allow resubmission
16. **Manager Allocations Dashboard** - Team leave balance overview
17. **Granular Access Flags** - Per-module access control (12 separate flags)

### 5.2 FEATURES COMPETITOR HAS THAT YOU LACK

These are **gaps to fill** in the mobile app:

1. **Facial Recognition Attendance** - Prevents buddy punching fraud
2. **Geofencing** - Location-based attendance validation with configurable radius
3. **Passcode Authentication** - Backup verification method
4. **Biometric App Login** - Fingerprint/Face ID for app access
5. **Badge ID + PIN Login** - For non-licensed employees
6. **Push Notifications** - Real-time alerts for approvals, announcements
8. **Personal Calendar View** - Color-coded attendance/leave/holiday calendar
9. **Daily Mood Tracking** - Employee well-being insights
10. **Company Announcements** - HR-to-all-employees broadcasting
11. **HR Chat Support** - Direct employee-HR messaging
12. **Personal Notes** - In-app notepad
13. **Check-in/Check-out Reminders** - Scheduled push notifications
14. **Dark Mode** - Theme support
15. **Payslip Download to Device** - Native file download
16. **Payslip Sharing** - Via WhatsApp, email, other apps
17. **Leave Allocation Requests** - Request additional leave days
18. **"My Team" Dashboard** - Real-time team attendance status for managers
19. **Multi-Company Switcher** - In-app company switching
20. **App Tour/Onboarding** - Guided first-use experience
21. **Work Schedule Viewing** - Employee schedule display

### 5.3 COMPETITOR'S IDENTIFIED WEAKNESSES (Your Opportunities)

1. **No In-App Analytics/Dashboards** - Raw data without insights
2. **Complex Backend Configuration** - Geofencing requires manual coordinate entry
3. **No Offline Capability** - Requires constant internet
4. **No MENA-Specific Compliance** - No GOSI (Saudi), no WPS (UAE), no labor law modules
5. **No Hijri Calendar Support** - Missing Islamic calendar
6. **Utilitarian UX** - Functional but lacks polish
7. **No Loan Management** - Entire feature missing
8. **No HR Letter/Document/Certificate Services** - Missing administrative services
9. **No Advance Salary** - Missing financial service
10. **No Attendance Sheets** - Only individual punches, no sheets
11. **No Task-Linked Attendance** - No project integration
12. **No Multi-Level Approval Chains** - Limited to single manager
13. **No Security Certifications** - No GDPR/SOC2 documentation
14. **Read-Only Profile** - Cannot update personal info in app

---

## 6. MOBILE APP PLANNING RECOMMENDATIONS

### 6.1 PROPOSED FEATURE TIERS

#### TIER 1 - CORE (MVP Launch)
All existing features from your modules + competitor's best features:

**From Your Modules (MUST HAVE):**
- Advance Salary Requests
- HR Letter Requests (Net/Gross)
- Document Requests
- Experience Certificate Requests
- Business Service Requests
- Attendance Check-in/Check-out
- Attendance Sheets
- Leave Management (Full-day, Half-day, Hourly)
- Leave Balance Display
- Manager Allocations Dashboard
- Loan Management (full workflow + business rules)
- Expense Management (multi-currency, taxes)
- Payslip Viewing & Printing
- Multi-level Approval Workflows
- Role-based Access (Employee/Manager/All)
- Resubmit After Refusal (all types)

**From Competitor (ADD):**
- Push Notifications (approvals, decisions, announcements)
- Biometric Login (Fingerprint/Face ID)
- Badge ID + PIN Login
- Payslip Download to Device
- Payslip Sharing (WhatsApp, email)
- Dark Mode
- Arabic RTL Support (native)
- Multi-Company Switcher

#### TIER 2 - ADVANCED
- Facial Recognition Attendance
- Geofencing (with map-based pin drop for setup)
- Personal Calendar View (color-coded)
- My Team Dashboard (real-time status)
- Company Announcements
- HR Chat Support
- Check-in/Check-out Reminders
- Leave Allocation Requests
- Work Schedule Viewing
- App Tour/Onboarding

#### TIER 3 - DIFFERENTIATORS (Beat Competitor)
- **Offline Mode** with sync queue
- **In-App Analytics Dashboard** (absenteeism trends, overtime, leave liability)
- **MENA Compliance Modules** (GOSI for KSA, WPS for UAE, Egyptian labor law)
- **Hijri Calendar Support**
- **Smart Geofencing** (map-based setup, visual radius, multiple locations)
- **Employee Profile Editing** (not read-only)
- **Bulk Approvals** for managers
- **Export to PDF/Excel** from all list views
- **Audit Trail** (who changed what, when)
- **Custom Workflow Designer** (configurable approval chains)
- **Eastern Arabic Numerals** support
- **Advanced Search & Filtering** across all modules
- **Document e-Signing** integration
- **Payroll Analytics** (salary trends, deduction breakdowns)

### 6.2 LICENSING MODEL RECOMMENDATION

**Two-Module Architecture (Independent of Odoo Licenses):**

The licensing system is split across two Odoo modules:

- **ess_hr_admin** (Admin Server): Centralized license manager. Validates client server URLs, controls which modules are active per license, sets auto-logout duration, tracks employee usage. Only the app developer's team has an admin server.
- **ess_hr_client** (Client Server): Installed on each customer's Odoo instance. Exposes business data APIs (attendance, leaves, payslip, etc.) and authenticates employees. No license key visible to end users.

**Activation Flow:**
1. Admin registers customer's server URL in ess_hr_admin → issues a license
2. Mobile app connects to admin server with customer's server URL → validates license → returns allowed modules + auto-logout config
3. Mobile app then connects directly to client server for all business data

**License Tiers (admin-controlled per license):**
- Basic: Attendance + Leaves + Payslip
- Standard: Basic + Expenses + Loans + Advance Salary
- Premium: Standard + HR Services + Analytics + Compliance

**License Limits:**
- Employee count threshold per license (e.g., 1-50, 51-200, 201-500, 500+)
- Grace period with employee limit enforcement (configurable)
- Annual subscription model; license expiry enforced on every API call

### 6.3 API ARCHITECTURE

**Direct Mobile-to-Odoo REST API (no middleware server):**

- Mobile app calls Odoo REST API endpoints directly — no separate Django or middleware layer
- Two independent API targets per session:
  - **Admin Server** (`ess_hr_admin`): License validation, module list, auto-logout config — called once at Step 1 login; URL fixed in app `.env`
  - **Client Server** (`ess_hr_client`): All business data (attendance, leaves, payslip, etc.) — URL entered by user at Step 1; persists in Redux + secure storage

**Authentication:**
- Client server uses Odoo session/token auth per employee
- Admin server uses a fixed service key (not exposed to employees)
- Per-request license check on client server (lightweight, cached)

**Mobile-side API layer:**
- Axios instance with dynamic `baseURL` set from Redux `auth.serverUrl`
- Response interceptor for token refresh (401) and server-down detection (network error)
- React Query for caching, background refresh, and optimistic updates

### 6.4 LANGUAGE & LOCALIZATION REQUIREMENTS

**Mandatory:**
- Arabic (RTL) - Primary market
- English (LTR) - Secondary
- Full RTL layout mirroring
- Hijri + Gregorian calendar support
- Eastern Arabic numerals option
- Date/time format localization
- Currency format localization

### 6.5 WIREFRAME SCREENS NEEDED (Arabic + English)

1. Login / License Activation
2. Home Dashboard
3. Attendance - Check In/Out
4. Attendance - History List
5. Attendance - Sheet View (Daily/Monthly)
6. Attendance - Calendar View
7. Leaves - Balance Overview
8. Leaves - Request Form (Full/Half/Hour)
9. Leaves - List View
10. Leaves - Detail View
11. Leave Allocations - Manager Dashboard
12. Advance Salary - List
13. Advance Salary - Request Form
14. Advance Salary - Detail
15. HR Letter - List
16. HR Letter - Request Form
17. HR Letter - Detail
18. Document Request - List
19. Document Request - Form
20. Document Request - Detail
21. Experience Certificate - List + Form + Detail
22. Business Service - List + Form + Detail
23. Loan - List
24. Loan - Application Form
25. Loan - Detail (with installments)
26. Expense - List
27. Expense - Claim Form
28. Expense - Detail
29. Payslip - List
30. Payslip - Detail (breakdown)
31. My Team Dashboard (Manager)
32. Approval Queue (Manager)
33. Employee Profile
34. Settings (Language, Theme, Notifications, Biometric)
35. Company Announcements
36. HR Chat
37. Personal Notes
38. Analytics Dashboard (Manager)
~~39. Tasks - My Tasks List~~ *(deferred — works with res.users, not hr.employee)*
~~40. Tasks - Task Detail (status, timer, attachments, time log)~~ *(deferred)*
~~41. Tasks - Add Attachment~~ *(deferred)*
~~42. Tasks - Log Time Entry~~ *(deferred)*
~~43. Tasks - Active Timer~~ *(deferred)*
~~44. Timesheets - My Timesheets (daily/weekly)~~ *(deferred)*
~~45. Timesheets - Day Detail~~ *(deferred)*
~~46. Timesheets - Team Timesheets (Manager)~~ *(deferred)*

---

## SUMMARY SCORECARD

| Category | Your Solution | Office Buddy | Notes |
|----------|:------------:|:------------:|-------|
| HR Administrative Services | 10/10 | 2/10 | You dominate (loans, letters, docs, certs, advance salary) |
| Attendance Core | 7/10 | 9/10 | Competitor has face recognition + geofencing |
| Leave Management | 9/10 | 7/10 | You have half-day, hourly, multi-level, mandatory docs |
| Expense Management | 9/10 | 6/10 | You have multi-currency, taxes, auto-report |
| Payslip | 6/10 | 8/10 | Competitor has native download + sharing |
| Employee Engagement | 2/10 | 8/10 | Competitor has mood, notes, announcements, chat |
| Mobile UX | 3/10 | 8/10 | You're web-portal; they're native mobile |
| Security/Auth | 4/10 | 9/10 | Competitor has face + geofence + biometric + badge |
| Manager Tools | 7/10 | 7/10 | Tie - different strengths |
| Licensing Innovation | 9/10 | 8/10 | Two-module arch: server URL activation, admin-controlled modules, no key exposed |
| Localization | 4/10 | 8/10 | Competitor has 100+ languages, RTL, dark mode |
| Offline Capability | 0/10 | 0/10 | Neither has it - opportunity! |
| Analytics | 0/10 | 0/10 | Neither has it - opportunity! |
| **OVERALL** | **70/130** | **79/130** | **Gap closable with strategic mobile app** |

---

**CONCLUSION:**

Your solution has significantly stronger **business logic and HR administrative features** (loans, advance salary, HR letters, documents, certificates, attendance sheets, multi-level approvals). The competitor excels in **mobile UX, security features, and employee engagement**.

The mobile app should combine YOUR deep HR functionality with the competitor's UX excellence, then differentiate by adding offline capability, analytics, and MENA compliance - features NEITHER solution currently offers.

---
*Report generated for mobile app planning - Phase 1: Analysis Complete*
*Next Phase: Wireframe design in Arabic and English*
