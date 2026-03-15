# ESS HR App

A cross-platform Employee Self Service (ESS) mobile application built with React Native, designed to connect employees to Odoo HR services through a modern, offline-capable mobile experience. The app targets MENA-region companies with full Arabic RTL and English LTR support.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Features & Modules](#features--modules)
  - [Phase 1 - MVP](#phase-1---mvp-months-1-4)
  - [Phase 2 - Growth](#phase-2---growth-months-5-8)
  - [Phase 3 - Premium](#phase-3---premium-months-9-12)
- [Wireframes](#wireframes)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the App](#running-the-app)
- [Development Guide](#development-guide)
- [Competitive Analysis](#competitive-analysis)
- [Success Metrics](#success-metrics)

---

## Project Overview

ESS HR App is a white-label Employee Self Service mobile application that acts as the mobile frontend to Odoo HR. It is designed to:

- Give employees 24/7 mobile access to all HR services
- Compete with and surpass existing ESS mobile solutions (e.g., Office Buddy)
- Provide a complete offline-capable experience with background sync
- Support MENA-region compliance (Hijri calendar, KSA/UAE/Egypt labor laws)
- Enable company-specific licensing and white-labeling

**Current Status:** Early development — React Native project scaffolded, architecture documented, wireframes complete, ready for feature implementation.

---

## Technology Stack

| Category | Technology | Version |
|---|---|---|
| Framework | React Native | 0.84.1 |
| Language | TypeScript | 5.8.3 |
| UI Library | React | 19.2.3 |
| Runtime | Node.js | >= 22.11.0 |
| Bundler | Metro | (RN 0.84) |
| Testing | Jest + React Test Renderer | 29.6.3 |
| Linting | ESLint | 8.19.0 |
| Formatting | Prettier | 2.8.8 |
| Android Min SDK | API 24 (Android 7.0) | — |
| Android Target SDK | API 36 | — |

**Planned additions (per architecture plan):**
- State management: Redux Toolkit + React Query (TanStack Query)
- Local database: SQLite via WatermelonDB (op-sqlite)
- Secure storage: React Native Keychain (iOS Keychain / Android Keystore)
- Push notifications: Firebase Cloud Messaging (FCM + APNs)
- Maps & geofencing: Google Maps SDK
- Biometrics: React Native Biometrics
- i18n: react-i18next
- Navigation: React Navigation (bottom tabs + stack)
- API layer: Axios with mock adapter (Phase 1) → Django REST Framework (Phase 2)

---

## Architecture

The system follows a **3-tier architecture**:

```
+-----------------------+
|   Mobile App (RN)     |  <-- React Native iOS/Android
|  Local DB + Offline   |      SQLite (WatermelonDB), Secure Token Store
+-----------+-----------+
            |
            | REST / JSON  [Phase 1: mock JSON | Phase 2: live]
            v
+-----------+-----------+
|   API Middleware       |  <-- Python Django REST Framework
|  Auth, Cache, Queue   |      JWT, Redis, Celery, Offline Queue
+-----------+-----------+
            |
            | JSON-RPC / XML-RPC
            v
+-----------+-----------+
|   Odoo Backend         |  <-- Odoo HR (existing)
|  HR Modules, Records  |
+-----------------------+
```

**Key architectural decisions:**

- **Offline-first:** All data is cached locally. Actions performed offline are queued and synced when connectivity is restored.
- **Company licensing:** App activation requires a company-specific license key before login. Supports multi-company switching.
- **Authentication:** Badge ID + PIN for non-Odoo users; username/password for Odoo users. JWT tokens with auto-refresh and single-device enforcement.
- **Security:** Encrypted local storage, audit trails, biometric unlock (Phase 2), 2FA (Phase 3).
- **Sync strategy:** Queue-based with conflict resolution. Timestamps drive merge decisions.
- **Push notifications:** Firebase-backed alerts for approvals, announcements, and request state changes.

Full architecture documentation: [wireframe/01_Architecture_Plan.md](wireframe/01_Architecture_Plan.md)

---

## Project Structure

```
ESS-HR-App/
├── app/                            # React Native application
│   ├── android/                    # Android native project (Gradle/Kotlin)
│   ├── ios/                        # iOS native project (Xcode/Swift/CocoaPods)
│   ├── __tests__/                  # Jest test files
│   ├── App.tsx                     # Root application component
│   ├── index.js                    # App entry point
│   ├── package.json                # NPM dependencies and scripts
│   ├── app.json                    # React Native app configuration
│   ├── tsconfig.json               # TypeScript configuration
│   ├── metro.config.js             # Metro bundler configuration
│   ├── babel.config.js             # Babel configuration
│   ├── jest.config.js              # Jest test configuration
│   ├── .eslintrc.js                # ESLint rules
│   └── .prettierrc.js              # Prettier formatting rules
│
├── wireframe/                      # Design, planning and analysis documents
│   ├── 01_Architecture_Plan.md     # Full 3-tier architecture specification
│   ├── 02_Feature_Roadmap.md       # 12-month 3-phase feature roadmap
│   ├── ESS_Analysis_Report.md      # Competitive analysis vs Office Buddy
│   └── wireframes/
│       ├── wireframes_en.html      # English (LTR) interactive wireframes
│       └── wireframes_ar.html      # Arabic (RTL) interactive wireframes
│
├── commands.txt                    # Dev environment commands reference
└── README.md                       # This file
```

---

## Features & Modules

The app is planned and documented across a 12-month, 3-phase roadmap (~220 features total).

### Phase 1 - MVP (Months 1-4)

~120 features across 14 modules. Deliverable: a fully functional ESS app covering all core HR workflows.

---

#### 1. Authentication & Licensing

- Company license key activation screen
- Company selection after license validation
- Login with Badge ID + PIN (non-Odoo users)
- Login with username + password (Odoo users)
- JWT token management with silent auto-refresh
- Session management with single-device enforcement
- Password reset flow
- Bilingual login UI (Arabic/English)

---

#### 2. Home Dashboard

- Employee profile header (photo, name, badge ID, department)
- Quick check-in / check-out button with live status
- Current attendance status (checked in/out, hours worked today)
- Leave balance summary cards (top leave types)
- Pending approval count badge (for managers)
- Recent requests with status chips
- Navigation grid linking to all modules

---

#### 3. Attendance Management

- One-tap check-in and check-out with timestamps
- GPS location capture on each action
- Timezone detection and DST adjustment
- Task/project assignment at check-in
- Attendance history list with date range filter
- Daily and monthly attendance sheets
- Line-by-line status codes: Absent, Weekend, Public Holiday, On Leave
- Sheet attachments and notes
- Sheet state machine: Draft → Confirmed → Done

---

#### 4. Leave Management

- Full-day, half-day (AM/PM), and hourly leave requests
- Real-time leave balance: Allocated - Used - Pending
- Multiple leave type support with per-type rules
- Conditional mandatory attachments per leave type
- Configurable description requirements
- Multi-level approval workflow: Employee → Manager → HR
- Manager actions: Approve, Refuse, Validate
- Reset to Draft and resubmit after refusal
- Manager allocations view (team balance overview)

---

#### 5. Payslip Module

- Payslip list with month/year filter
- Detailed payslip breakdown: Earnings, Deductions, Net
- PDF generation and print
- Download to device
- Share via email, WhatsApp, or other apps
- Status tracking: Draft, Waiting, Done, Paid, Rejected

---

#### 6. Expense Management

- Create expense claims with category selection
- Multi-currency support
- Tax calculation with purchase tax selection
- Receipt attachment (camera or gallery)
- Multiple file attachments per claim
- Payment mode: Company Paid / Employee Paid / etc.
- Attachment deduplication
- Automatic expense report creation on submission
- Edit/delete draft expenses

---

#### 7. Loan Management

- Loan applications with automated business rule validation:
  - Minimum hiring period check (configurable per company)
  - Maximum loan duration enforcement
  - Minimum gap between consecutive loans
  - Max loan amount derived from employee contract
- Multi-level approval: Employee → Manager → HR → CEO
- Loan transfer method selection
- Installment schedule display
- Full status history

---

#### 8. Advance Salary

- Advance salary request creation
- Automated 50% basic salary cap validation with maximum amount display
- Approval/refusal workflow
- Manager approval capability
- Reset and resubmit after refusal
- Edit/delete draft requests

---

#### 9. HR Letters

- HR letter request creation
- "Directed To" recipient field
- Net salary / Gross salary type selection
- Full approval workflow
- Edit/delete drafts

---

#### 10. Document Requests

- Document request creation
- Document type selection from dropdown
- Return date specification
- Full approval workflow
- Edit/delete drafts

---

#### 11. Experience Certificates

- Certificate request creation
- "Directed To" field
- Request date specification
- Full workflow support
- Edit/delete drafts

---

#### 12. Business Services

- Service request creation
- Dynamic service type dropdown (loaded from Odoo configuration)
- Reason and requested date fields
- Full approval workflow

---

#### 13. Tasks & Timesheets

- View assigned tasks with project, stage, deadline, and priority
- Task filtering and search
- Task detail view
- Update task stage via drag or selector
- Start/stop timer with persistence across navigation and app background
- Persistent mini-timer bar visible app-wide
- Manual time log entry with hours and description
- Daily and weekly timesheet view with totals
- View and upload attachments on tasks
- Weekly summary card

---

#### 14. Employee Profile

- Personal information (name, photo, date of birth, nationality)
- Work information (department, position, manager)
- Contact details (phone, work email)
- Contract summary (hiring date, contract type)

---

#### Cross-Cutting (Phase 1)

- **Settings:** Language toggle (Arabic/English), dark mode, app version, logout
- **Localization:** Full Arabic RTL layout, English LTR, all strings bilingual
- **Offline cache:** Cache last-viewed data per module, pull-to-refresh
- **Error handling:** User-friendly bilingual error messages and network status indicator
- **Role-based access:** Employee (own records), Manager (team + own), HR/Admin (all)

---

### Phase 2 - Growth (Months 5-8)

~55 additional features:

- Biometric authentication (fingerprint, Face ID)
- Face recognition attendance
- Geofencing with configurable radius for check-in/check-out validation
- Manager Tools: My Team dashboard, approval queue, bulk approval actions
- Employee Engagement: Company announcements, HR chat, personal notes, mood tracking
- Full offline mode: Queue-based sync with conflict resolution
- Multi-company support with company switcher
- Advanced tasks: Edit time entries, team timesheet view
- Calendar view for attendance and leave
- Work schedule display
- App tour / onboarding
- Haptic feedback
- Global search across all modules

---

### Phase 3 - Premium (Months 9-12)

~45 additional features:

- Analytics dashboards: Absenteeism trends, overtime reports, leave liability
- MENA compliance: Hijri calendar integration, KSA/UAE/Egypt labor law rules, End of Service (EOS) calculation
- Advanced security: Audit trails, IP whitelisting, Two-Factor Authentication (2FA)
- Workflow designer (custom approval chains)
- Document e-signing
- Organization chart
- Google Calendar and Outlook calendar sync
- Slack and Microsoft Teams integration
- Webhook support for external systems
- White-label support (custom branding per client)
- Employee training modules
- Performance evaluations
- Knowledge base

Full roadmap: [wireframe/02_Feature_Roadmap.md](wireframe/02_Feature_Roadmap.md)

---

## Wireframes

Interactive HTML wireframe mockups are available for all major screens:

| File | Description |
|---|---|
| [wireframe/wireframes/wireframes_en.html](wireframe/wireframes/wireframes_en.html) | English (LTR) interactive wireframes — open in browser |
| [wireframe/wireframes/wireframes_ar.html](wireframe/wireframes/wireframes_ar.html) | Arabic (RTL) interactive wireframes — open in browser |

The wireframes cover:
- License activation and login screens
- Home dashboard
- Attendance check-in/out and history
- Leave request forms and list views
- Payslip list and detail
- Expense creation and list
- Loan, advance salary, HR letters, document request forms
- Tasks and timesheet views
- Employee profile
- Manager team and approval screens
- Settings

---

## Getting Started

### Prerequisites

- Node.js >= 22.11.0
- React Native CLI
- Android Studio (for Android development)
  - Android SDK API 36
  - Android NDK 27.1.12297006
- Xcode (for iOS development, macOS only)
- CocoaPods (for iOS)
- JDK 17+

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd ESS-HR-App/app

# Install Node dependencies
npm install

# iOS only — install CocoaPods dependencies
cd ios && pod install && cd ..
```

### Running the App

```bash
# Start the Metro development server
npm start

# Run on Android (in a separate terminal)
npm run android

# Run on iOS (in a separate terminal, macOS only)
npm run ios
```

**Android emulator (manual):**
```bash
# Launch Android emulator
emulator -avd <avd_name>

# Or from Android Studio: Device Manager > Start
```

**Clean build (if build issues occur):**
```bash
cd android
./gradlew clean
cd ..
npm run android
```

**Diagnostics:**
```bash
npx react-native doctor
```

---

## Development Guide

### Code Style

- **TypeScript** is required for all source files.
- **ESLint** and **Prettier** are configured. Run before committing:
  ```bash
  npm run lint
  ```
- Follow React Native best practices: functional components, hooks, no class components.

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage
```

### Key Conventions (planned)

- **Navigation:** React Navigation with bottom tab navigator + stack navigators per module
- **State:** Redux Toolkit slices for global state (auth, settings); React Query for server-state caching
- **API layer:** Centralized Axios client with `axios-mock-adapter` in Phase 1; switches to live Django API in Phase 2 via a single `MOCK_MODE` flag in `src/config/env.ts`
- **Local DB:** SQLite via WatermelonDB — all cached data and offline queue stored here
- **Offline:** All mutations go through an offline queue (persisted to SQLite), flushed on reconnect
- **i18n:** All user-facing strings in translation files (react-i18next), no hardcoded text
- **RTL:** Use `I18nManager.isRTL` and flexbox direction to support Arabic RTL and English LTR

---

## Competitive Analysis

The app is designed to surpass **Office Buddy**, the leading ESS mobile competitor in the MENA market.

| Area | Current Odoo Portal | Office Buddy | This App (Target) |
|---|---|---|---|
| Loan management | Strong (full lifecycle) | Weak | Strong |
| Advance salary | Strong (50% cap validation) | Basic | Strong |
| HR letters & docs | Strong | Weak | Strong |
| Expense multi-currency | Strong | Basic | Strong |
| Multi-level approvals | Strong | Partial | Strong |
| Biometric login | None | Strong | Phase 2 |
| Geofencing | None | Strong | Phase 2 |
| Push notifications | None | Strong | Phase 1 |
| Dark mode + RTL | None | Strong | Phase 1 |
| Manager team view | None | Strong | Phase 2 |
| Offline mode | None | None | Phase 2 (differentiator) |
| MENA compliance | None | None | Phase 3 (differentiator) |
| Analytics dashboards | None | None | Phase 3 (differentiator) |

**Overall scores (from analysis):**
- Current Odoo portal: 66/130 (strong admin, weak mobile UX)
- Office Buddy: 80/130 (strong UX, weak admin features)
- This app target: 120+/130 (combines both strengths + unique features)

Full analysis: [wireframe/ESS_Analysis_Report.md](wireframe/ESS_Analysis_Report.md)

---

## Success Metrics

| Phase | KPI | Target |
|---|---|---|
| Phase 1 | App Store rating | >= 4.0 stars |
| Phase 1 | Daily Active Users | >= 60% of registered users |
| Phase 1 | Check-in feature adoption | >= 80% |
| Phase 1 | Average session duration | < 2 minutes (fast task completion) |
| Phase 2 | Feature parity with competitors | 100% |
| Phase 2 | Manager adoption rate | >= 70% |
| Phase 3 | Enterprise clients | >= 5 |
| Phase 3 | White-label deployments | >= 3 |

---

## License

Proprietary. Company-specific license key activation required for use.
