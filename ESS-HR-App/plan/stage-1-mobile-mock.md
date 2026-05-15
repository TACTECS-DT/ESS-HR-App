# Stage 1 — Mobile App with Mock JSON

Build the complete React Native app against static mock JSON responses.
No backend required. At the end of this stage the app is fully functional
on Android and iOS using mocked data for every module.

---

## Milestone 1 (Project Foundation & Setup)

- Task 1.1 — Initialize React Native project with TypeScript template (its done juts check if all good)
- Task 1.2 — Install core dependencies: React Navigation, Redux Toolkit, React Query (TanStack Query), Axios, react-i18next, WatermelonDB (op-sqlite), React Native Keychain
- Task 1.3 — Create full folder structure under `src/`:
  ```
  src/
  ├── api/          # axios client + mocks
  ├── components/   # shared UI components
  ├── config/       # env.ts, constants
  ├── i18n/         # translation files
  ├── navigation/   # navigators
  ├── screens/      # one folder per module
  ├── store/        # Redux slices
  └── types/        # shared TypeScript types
  ```
- Task 1.4 — Configure ESLint, Prettier, and TypeScript strict mode
- Task 1.5 — Set up Jest with React Native Testing Library
- Task 1.6 — Verify Android emulator and iOS simulator run the bare app

---

## Milestone 2 (Mock API Layer)

- Task 2.1 — Install `axios-mock-adapter`
- Task 2.2 — Create `src/config/env.ts` with `MOCK_MODE` flag (set to `true`)
- Task 2.3 — Create base Axios client with request/response interceptors
- Task 2.4 — Define shared TypeScript types for API response envelopes:
  - Success: `{ success, data, message, pagination }`
  - Error: `{ success, error: { code, message, message_ar, field } }`
- Task 2.5 — Create mock JSON files for every module under `src/api/mocks/`:
  - `auth.mock.ts`
  - `attendance.mock.ts`
  - `leave.mock.ts`
  - `payslip.mock.ts`
  - `expense.mock.ts`
  - `loan.mock.ts`
  - `advance-salary.mock.ts`
  - `hr-letters.mock.ts`
  - `document-requests.mock.ts`
  - `experience-certificates.mock.ts`
  - `business-services.mock.ts`
  - `tasks.mock.ts`
  - `timesheets.mock.ts`
  - `profile.mock.ts`
- Task 2.6 — Wire mock adapter to all module endpoints when `MOCK_MODE = true`
- Task 2.7 — Simulate realistic delays (300–800ms) in mock responses

---

## Milestone 3 (i18n & RTL Foundation)

- Task 3.1 — Configure react-i18next with language detector
- Task 3.2 — Create `en.json` and `ar.json` translation files with all string keys
- Task 3.3 — Implement language toggle with AsyncStorage persistence (survives app restart)
- Task 3.4 — Configure `I18nManager.forceRTL` switching with app reload
- Task 3.5 — Create RTL-aware style utilities (directional padding, margin, flex helpers)
- Task 3.6 — Verify Arabic RTL layout on a sample screen before building all screens

---

## Milestone 4 (Navigation Structure)

- Task 4.1 — Install React Navigation and all required dependencies (`@react-navigation/native`, `@react-navigation/bottom-tabs`, `@react-navigation/stack`)
- Task 4.2 — Create Auth stack navigator: License Activation → Company Selection → Login
- Task 4.3 — Create Main bottom tab navigator with 5 tabs: Home, Attendance, Requests, Tasks, Profile
- Task 4.4 — Create stack navigators for each module (nested inside tabs)
- Task 4.5 — Implement navigation guard: redirect to Auth stack if no valid token
- Task 4.6 — Define all navigation route types in TypeScript (type-safe navigation)

---

## Milestone 5 (State Management)

- Task 5.1 — Configure Redux Toolkit store with persistence (redux-persist + AsyncStorage)
- Task 5.2 — Create `authSlice`: token, refresh token, user info, company
- Task 5.3 — Create `settingsSlice`: language, dark mode
- Task 5.4 — Configure React Query client with default stale time and retry settings
- Task 5.5 — Implement secure token storage with React Native Keychain (read/write/clear)
- Task 5.6 — Add Axios interceptor: attach Bearer token to all requests
- Task 5.7 — Add Axios interceptor: on 401 attempt silent token refresh, then retry

---

## Milestone 6 (Authentication & Licensing Screens)

- Task 6.1 — License activation screen: enter company key, call mock validate endpoint, show error on invalid key
- Task 6.2 — Company selection screen: list companies returned from mock, select and store
- Task 6.3 — Login screen: Badge ID + PIN form with validation
- Task 6.4 — Login screen: Username + Password form with toggle between login modes
- Task 6.5 — Password reset flow: enter email/badge, confirm code, set new password
- Task 6.6 — Auto-login: on app launch check stored token, skip login if valid
- Task 6.7 — Logout: clear Redux state, clear Keychain, navigate to Auth stack

---

## Milestone 7 (Home Dashboard)

- Task 7.1 — Employee profile header: photo, name, badge ID, department, job title
- Task 7.2 — Check-in / check-out quick action button with real-time status display
- Task 7.3 — Attendance status card: checked in/out, hours worked today
- Task 7.4 — Leave balance summary cards (top 3 leave types)
- Task 7.5 — Pending approvals badge (visible for Manager and HR roles)
- Task 7.6 — Recent requests list with colored status chips
- Task 7.7 — Module navigation grid (icons linking to each module)

---

## Milestone 8 (Attendance Module)

- Task 8.1 — Check-in screen: one-tap button, timestamp display, task/project selector
- Task 8.2 — GPS location capture on check-in and check-out
- Task 8.3 — Check-out screen: confirm action, show total hours worked
- Task 8.4 — Attendance history list: date range filter, pull-to-refresh
- Task 8.5 — Daily attendance sheet view: all entries for a selected day with status codes
- Task 8.6 — Monthly attendance sheet view: calendar-style with status per day
- Task 8.7 — Status code display: Absent, Weekend, Public Holiday, On Leave
- Task 8.8 — Sheet state badge: Draft / Confirmed / Done

---

## Milestone 9 (Leave Management)

- Task 9.1 — Leave request form: leave type selector, date picker (full-day, half-day AM/PM, hourly)
- Task 9.2 — Real-time leave balance display on form: Allocated − Used − Pending
- Task 9.3 — Conditional mandatory attachment per leave type
- Task 9.4 — Description field (shown/required based on leave type config)
- Task 9.5 — Leave requests list: filter by status (Draft, Pending, Approved, Refused)
- Task 9.6 — Leave request detail with approval history timeline
- Task 9.7 — Manager approval screen: Approve / Refuse / Validate actions
- Task 9.8 — Reset to Draft and resubmit flow after refusal
- Task 9.9 — Manager team leave allocations view (team members' balances)

---

## Milestone 10 (Payslip Module)

- Task 10.1 — Payslip list screen: month/year filter, status chips (Draft / Done / Paid)
- Task 10.2 — Payslip detail screen: Earnings section, Deductions section, Net Pay summary
- Task 10.3 — PDF viewer integration (react-native-pdf or WebView)
- Task 10.4 — Download payslip to device storage
- Task 10.5 — Share payslip via email, WhatsApp, or system share sheet

---

## Milestone 11 (Expense Management)

- Task 11.1 — Expense creation form: category, amount, currency selector, purchase tax
- Task 11.2 — Payment mode selection (Company Paid / Employee Paid)
- Task 11.3 — Receipt attachment: camera capture or gallery picker
- Task 11.4 — Multiple attachments per expense with deduplication check
- Task 11.5 — Expense list: filter by status, pull-to-refresh
- Task 11.6 — Edit and delete draft expenses
- Task 11.7 — Submit expense → auto-create expense report (shown in response)

---

## Milestone 12 (Loan Management)

- Task 12.1 — Loan application form: amount, duration, transfer method
- Task 12.2 — Business rule validation display before submit:
  - Minimum hiring period check
  - Maximum loan duration check
  - Minimum gap between loans check
  - Maximum loan amount from contract
- Task 12.3 — Loan list with status filter
- Task 12.4 — Loan detail: installment schedule table
- Task 12.5 — Loan status history / approval trail

---

## Milestone 13 (Advance Salary)

- Task 13.1 — Advance salary request form: amount field with max cap display
- Task 13.2 — Display 50% basic salary cap validation feedback
- Task 13.3 — Advance salary list with status filter
- Task 13.4 — Manager approve / refuse actions
- Task 13.5 — Reset to draft and resubmit after refusal
- Task 13.6 — Edit and delete draft requests

---

## Milestone 14 (HR Letters, Document Requests, Experience Certificates)

- Task 14.1 — HR Letter request form: directed-to field, salary type selector (net / gross)
- Task 14.2 — Document request form: document type dropdown, return date picker
- Task 14.3 — Experience certificate form: directed-to field, request date
- Task 14.4 — Shared requests list screen (filterable by module type and status)
- Task 14.5 — Shared detail screen with approval history
- Task 14.6 — Edit / delete draft requests for all three modules
- Task 14.7 — Approve / refuse / reset actions for managers

---

## Milestone 15 (Business Services)

- Task 15.1 — Business service request form: dynamic service type dropdown, reason, requested date
- Task 15.2 — Service types loaded from mock (simulating Odoo configuration)
- Task 15.3 — Requests list with status filter
- Task 15.4 — Full approval workflow UI (same as other service modules)

---

## Milestone 16 (Tasks & Timesheets)

- Task 16.1 — Task list: project, stage, deadline, priority display with search and filter
- Task 16.2 — Task detail screen: full info, attachments, description
- Task 16.3 — Stage update: selector dropdown or drag on kanban-style view
- Task 16.4 — Start / stop timer button on task detail
- Task 16.5 — Timer persistence: continues when navigating away or backgrounding the app
- Task 16.6 — Persistent mini-timer bar visible across all screens while timer is running
- Task 16.7 — Manual time log entry: date, hours, description
- Task 16.8 — Daily timesheet view: all logs for a day with total hours
- Task 16.9 — Weekly timesheet view: grouped by day with weekly total
- Task 16.10 — Task attachment viewer and upload

---

## Milestone 17 (Employee Profile)

- Task 17.1 — Personal information section: name, photo, date of birth, nationality
- Task 17.2 — Work information section: department, job position, manager
- Task 17.3 — Contact details section: phone, work email
- Task 17.4 — Contract summary section: hiring date, contract type

---

## Milestone 18 (Settings & Cross-Cutting)

- Task 18.1 — Settings screen: language toggle (Arabic/English), dark mode toggle, app version, logout
- Task 18.2 — Dark mode: implement system-wide theme (colors, backgrounds, text)
- Task 18.3 — Offline banner: show "No internet connection" indicator when offline
- Task 18.4 — Pull-to-refresh on all list screens
- Task 18.5 — Offline cache: store last-viewed data per module in SQLite (WatermelonDB)
- Task 18.6 — Loading skeleton screens for all list and detail views
- Task 18.7 — Empty state illustrations for screens with no data
- Task 18.8 — Bilingual error messages for all mock API error codes
- Task 18.9 — Role-based UI: hide manager-only actions for Employee role
- Task 18.10 — App icon and splash screen setup for Android and iOS
