# ESS Mobile App - Technical Architecture Plan
# هيكلة تطبيق الخدمة الذاتية للموظفين

---
**Version:** 1.0
**Date:** 2026-03-10
**Status:** Planning Phase

---

## TABLE OF CONTENTS

1. [System Overview](#1-system-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Mobile App Layer](#3-mobile-app-layer)
4. [API Middleware Layer](#4-api-middleware-layer)
5. [Odoo Integration Layer](#5-odoo-integration-layer)
6. [Authentication & Licensing System](#6-authentication--licensing-system)
7. [Database Architecture](#7-database-architecture)
8. [Offline Sync Strategy](#8-offline-sync-strategy)
9. [Push Notification System](#9-push-notification-system)
10. [Security Architecture](#10-security-architecture)
11. [Deployment Architecture](#11-deployment-architecture)
12. [Third-Party Integrations](#12-third-party-integrations)

---

## 1. SYSTEM OVERVIEW

### 1.1 High-Level Architecture

The system follows a **3-Tier Architecture** with an independent middleware layer:

```
┌─────────────────────────────────────────────────────┐
│                  MOBILE APP                          │
│          (iOS + Android - React Native)              │
│                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │Attendance│ │  Leaves  │ │  Loans   │ ... more   │
│  └──────────┘ └──────────┘ └──────────┘            │
│                                                      │
│  ┌──────────────────────────────────────────┐       │
│  │ Local Storage (SQLite / Hive / Realm)    │       │
│  │ Offline Queue | Cache | Secure Store     │       │
│  └──────────────────────────────────────────┘       │
└──────────────────┬──────────────────────────────────┘
                   │ HTTPS/REST API
                   ▼
┌─────────────────────────────────────────────────────┐
│              API MIDDLEWARE SERVER                    │
│          (Python Django REST Framework)               │
│                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │   Auth   │ │ License  │ │   Push   │            │
│  │ Service  │ │ Manager  │ │Notifier  │            │
│  └──────────┘ └──────────┘ └──────────┘            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │   API    │ │  Cache   │ │  Queue   │            │
│  │ Gateway  │ │  Layer   │ │ Manager  │            │
│  └──────────┘ └──────────┘ └──────────┘            │
│                                                      │
│  ┌──────────────────────────────────────────┐       │
│  │ Middleware Database (PostgreSQL/MongoDB)  │       │
│  │ Licenses | Sessions | Push Tokens | Logs │       │
│  └──────────────────────────────────────────┘       │
└──────────────────┬──────────────────────────────────┘
                   │ JSON-RPC / XML-RPC / REST
                   ▼
┌─────────────────────────────────────────────────────┐
│              ODOO 18 INSTANCE                        │
│          (Client's Odoo Server)                      │
│                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │    HR    │ │ Payroll  │ │Attendance│            │
│  └──────────┘ └──────────┘ └──────────┘            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │  Leaves  │ │ Expense  │ │  Loans   │            │
│  └──────────┘ └──────────┘ └──────────┘            │
│                                                      │
│  ┌──────────────────────────────────────────┐       │
│  │ Single API Service User Account          │       │
│  │ (Shared connection for all app users)    │       │
│  └──────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────┘
```

### 1.2 Design Principles

1. **Independence from Odoo Licensing** - App has its own license system; employees don't need Odoo user accounts
2. **Single API User** - One Odoo service account handles all mobile app requests
3. **Offline-First** - Core features work without internet; sync when connected
4. **API Middleware** - Never expose Odoo directly; middleware handles auth, caching, queuing
5. **Multi-Tenant** - One middleware server can serve multiple companies/Odoo instances
6. **Bilingual Native** - Arabic RTL and English LTR from day one
7. **Modular** - Features are independent modules that can be enabled/disabled per license tier

---

## 2. ARCHITECTURE DIAGRAM

### 2.1 Request Flow

```
Employee opens app
    │
    ├── [Offline?] → Read from Local Cache → Display
    │                    └── Queue action for sync
    │
    └── [Online] → API Request
                      │
                      ▼
              ┌── Middleware ──┐
              │                │
              │ 1. Validate    │
              │    JWT Token   │
              │                │
              │ 2. Check       │
              │    License     │
              │                │
              │ 3. Check       │
              │    Cache       │
              │    ├── HIT → Return cached data
              │    └── MISS ──┐
              │               │
              │ 4. Forward    │
              │    to Odoo    │──→ Odoo JSON-RPC
              │               │←── Response
              │ 5. Cache      │
              │    Response   │
              │               │
              │ 6. Return     │
              │    to App     │
              └───────────────┘
```

### 2.2 Authentication Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Mobile App │     │  Middleware   │     │    Odoo      │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                     │
       │ 1. Enter License   │                     │
       │    Key + Company   │                     │
       │───────────────────>│                     │
       │                    │ 2. Validate License │
       │                    │    (own DB)         │
       │                    │                     │
       │ 3. Enter Badge ID  │                     │
       │    + PIN            │                     │
       │───────────────────>│                     │
       │                    │ 4. Lookup employee  │
       │                    │    by Badge ID/PIN  │
       │                    │────────────────────>│
       │                    │                     │
       │                    │ 5. Employee data    │
       │                    │<────────────────────│
       │                    │                     │
       │ 6. Return JWT      │                     │
       │    Token + Profile  │                     │
       │<───────────────────│                     │
       │                    │                     │
       │ 7. Store token     │                     │
       │    securely        │                     │
       │    (Keychain/       │                     │
       │     Keystore)      │                     │
       │                    │                     │
       │ 8. Setup Biometric │                     │
       │    (optional)      │                     │
```

---

## 3. MOBILE APP LAYER

### 3.1 Technology Stack Options

**Framework: React Native (TypeScript)** — Large ecosystem, hot reload, code sharing with web, strong community, excellent tooling. RTL/Arabic is handled via `I18nManager` and flexbox direction.

### 3.2 App Module Structure

```
lib/
├── src/
│   ├── api/                    # Axios client, interceptors, Odoo JSON-RPC adapters
│   ├── auth/                   # Authentication service, token management
│   ├── cache/                  # Local caching layer
│   ├── config/                 # App configuration (env, constants)
│   ├── localization/           # Arabic/English i18n (react-i18next)
│   ├── navigation/             # React Navigation (bottom tabs + stacks)
│   ├── offline/                # Offline queue & sync engine
│   ├── notifications/          # Firebase push notification handling
│   ├── security/               # Biometric (RN Biometrics), secure storage
│   ├── store/                  # Redux Toolkit store & root reducer
│   └── theme/                  # Light/Dark theme, RTL (I18nManager) support
│
├── features/
│   ├── auth/                   # Login, license activation, biometric setup
│   │   ├── api/
│   │   ├── store/              # Redux slice
│   │   └── screens/
│   │
│   ├── dashboard/              # Home dashboard
│   ├── attendance/             # Check-in/out, history, sheets, calendar
│   ├── leaves/                 # Requests, balance, allocations
│   ├── payslip/                # View, download, share
│   ├── expenses/               # Claims, receipts, reports
│   ├── loans/                  # Applications, installments
│   ├── advance_salary/         # Salary advance requests
│   ├── hr_letters/             # HR letter requests
│   ├── documents/              # Document requests
│   ├── certificates/           # Experience certificates
│   ├── business_services/      # Business service requests
│   ├── my_team/                # Manager team dashboard
│   ├── approvals/              # Manager approval queue
│   ├── profile/                # Employee profile
│   ├── announcements/          # Company announcements
│   ├── hr_chat/                # Chat with HR
│   ├── notes/                  # Personal notes
│   ├── analytics/              # Dashboards & reports
│   └── settings/               # App settings
│
├── components/
│   ├── common/                 # Reusable UI components (Button, Card, Input…)
│   ├── forms/                  # Form field components
│   └── layout/                 # Screen wrappers, headers, tab bars
│
├── App.tsx                     # Root component (NavigationContainer, providers)
└── index.js                    # App entry point (registerRootComponent)
```

### 3.3 State Management

**Recommended: Redux Toolkit + React Query**

- Redux Toolkit slices for global app state (auth, user, settings)
- React Query (TanStack Query) for server-state caching and synchronization
- Predictable state management with DevTools support
- Easy unit testing of reducers and selectors
- Well-suited for complex approval workflows and offline queue state

### 3.4 Local Storage Architecture

```
┌─────────────────────────────────────────┐
│          LOCAL STORAGE LAYER            │
│                                         │
│  ┌───────────────┐  ┌───────────────┐  │
│  │  Secure Store │  │   SQLite DB   │  │
│  │  (Keychain/   │  │  (WatermelonDB│  │
│  │   Keystore)   │  │               │  │
│  │               │  │  - Employee   │  │
│  │  - JWT Token  │  │    Profile    │  │
│  │  - PIN Hash   │  │  - Cached     │  │
│  │  - Biometric  │  │    Lists      │  │
│  │    Ref        │  │  - Offline    │  │
│  │  - License    │  │    Queue      │  │
│  │    Key        │  │  - Settings   │  │
│  └───────────────┘  └───────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │        File Storage               │  │
│  │  - Downloaded payslips (PDF)      │  │
│  │  - Receipt photos (compressed)    │  │
│  │  - Attachment cache               │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## 4. API MIDDLEWARE LAYER

### 4.0 Phase 1 Mock Strategy (Django Not Built Yet)

During Phase 1 mobile development, all API calls will be intercepted and served by a local mock layer inside the React Native app. This ensures the mobile team can build every screen and feature end-to-end without a live server.

#### Mock Implementation Approach

```
React Native App
      │
      ▼
  Axios API Client
      │
      ├── [MOCK_MODE = true]
      │       │
      │       ▼
      │   Mock Adapter (axios-mock-adapter)
      │   Intercepts every request by URL + method
      │   Returns static JSON fixture from /src/api/mocks/
      │       │
      │       └── Simulates:
      │           ├── Network delay (300–800ms random)
      │           ├── Success responses (200 / 201)
      │           ├── Error responses (400 / 401 / 422 / 500)
      │           └── Paginated list responses
      │
      └── [MOCK_MODE = false]
              │
              ▼
          Real Django API (future)
```

#### Mock File Structure

```
src/
└── api/
    ├── client.ts              # Axios instance + interceptors
    ├── mockAdapter.ts         # Registers all mock routes (axios-mock-adapter)
    └── mocks/
        ├── auth/
        │   ├── activate.json          # POST /auth/activate response
        │   ├── login_success.json     # POST /auth/login response
        │   └── login_error.json       # 401 response
        ├── attendance/
        │   ├── list.json              # GET /attendance
        │   ├── status.json            # GET /attendance/status
        │   ├── checkin.json           # POST /attendance/checkin
        │   ├── sheets.json            # GET /attendance/sheets
        │   └── sheet_detail.json      # GET /attendance/sheets/:id
        ├── leaves/
        │   ├── list.json
        │   ├── detail.json
        │   ├── balance.json
        │   └── allocations.json
        ├── payslips/
        │   ├── list.json
        │   └── detail.json
        ├── expenses/
        │   ├── list.json
        │   ├── detail.json
        │   └── categories.json
        ├── loans/
        │   ├── list.json
        │   ├── detail.json
        │   └── eligibility.json
        ├── advance_salary/
        │   ├── list.json
        │   └── max_amount.json
        ├── hr_letters/
        │   └── list.json
        ├── documents/
        │   └── list.json
        ├── certificates/
        │   └── list.json
        ├── business_services/
        │   ├── list.json
        │   └── types.json
        ├── tasks/
        │   ├── list.json
        │   ├── detail.json
        │   └── stages.json
        ├── timesheets/
        │   ├── list.json
        │   └── summary.json
        ├── profile/
        │   └── me.json
        ├── notifications/
        │   └── list.json
        └── dashboard/
            └── summary.json
```

#### Mock Response Shape Contract

Every mock response must match the exact JSON shape the real Django API will return. This is the **API contract** — once Django is built, only the `mockAdapter.ts` toggle changes; all screens, state slices, and serializers remain untouched.

**Envelope format (all responses):**
```json
{
  "success": true,
  "data": { ... },
  "message": "OK",
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 45,
    "has_next": true
  }
}
```

**Error format:**
```json
{
  "success": false,
  "error": {
    "code": "LEAVE_BALANCE_INSUFFICIENT",
    "message": "You don't have enough leave balance.",
    "message_ar": "رصيد الإجازات غير كافٍ.",
    "field": "duration"
  }
}
```

#### Switching to Real API

When Django is ready, switching is a single flag change:

```ts
// src/config/env.ts
export const MOCK_MODE = false;  // change true → false
```

No screen code, no Redux slice, no hook changes needed.

---

### 4.1 Technology Stack (Django — Built in Phase 2)

> **Development Phase Note:** The Django middleware will **not** be built in Phase 1. During Phase 1, the React Native app will consume **static mock JSON responses** that mirror the real API contract. This allows full mobile development and UI iteration without a live backend. See Section 4.0 for the mock strategy.

**Selected: Python Django REST Framework (DRF)**
- Mature, battle-tested framework with a large ecosystem
- Django ORM for clean middleware database management and migrations
- DRF provides powerful serializers, viewsets, and API routing
- Native Python JSON-RPC client support for Odoo integration
- Built-in admin panel for license and company management
- Strong typing with DRF serializers and Django model validators
- Auto-generated API documentation (drf-spectacular / Swagger)
- Django Celery for background jobs (offline sync, push notifications, reminders)


### 4.2 Middleware Services

```
middleware/
├── app/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── auth.py              # Login, token refresh, biometric
│   │   │   ├── license.py           # License activation, validation
│   │   │   ├── attendance.py        # Check-in/out, history, sheets
│   │   │   ├── leaves.py            # CRUD + approval actions
│   │   │   ├── payslip.py           # List, detail, PDF download
│   │   │   ├── expenses.py          # CRUD + file upload
│   │   │   ├── loans.py             # CRUD + multi-level approval
│   │   │   ├── advance_salary.py    # CRUD + approval
│   │   │   ├── hr_letters.py        # CRUD + approval
│   │   │   ├── documents.py         # CRUD + approval
│   │   │   ├── certificates.py      # CRUD + approval
│   │   │   ├── business_services.py # CRUD + approval
│   │   │   ├── profile.py           # Employee profile
│   │   │   ├── team.py              # Manager team view
│   │   │   ├── announcements.py     # Company announcements
│   │   │   ├── chat.py              # HR chat messages
│   │   │   └── notifications.py     # Push notification registration
│   │   └── health.py                # Health check endpoint
│   │
│   ├── services/
│   │   ├── odoo_client.py           # Odoo JSON-RPC client wrapper
│   │   ├── license_service.py       # License validation logic
│   │   ├── cache_service.py         # Redis cache manager
│   │   ├── push_service.py          # FCM/APNs push notifications
│   │   ├── file_service.py          # File upload/download handler
│   │   ├── geofence_service.py      # Location validation
│   │   └── face_service.py          # Face recognition API wrapper
│   │
│   ├── models/
│   │   ├── license.py               # License DB model
│   │   ├── device.py                # Device registration model
│   │   ├── push_token.py            # Push notification tokens
│   │   ├── sync_queue.py            # Offline sync queue
│   │   └── audit_log.py             # Action audit trail
│   │
│   ├── middleware/
│   │   ├── auth_middleware.py        # JWT verification
│   │   ├── license_middleware.py     # License check per request
│   │   ├── rate_limiter.py          # Rate limiting
│   │   └── error_handler.py         # Global error handling
│   │
│   └── config/
│       ├── settings.py              # Environment configuration
│       └── database.py              # DB connection setup
│
├── migrations/                       # Database migrations
├── tests/                           # API tests
├── Dockerfile
├── docker-compose.yml
└── requirements.txt
```

### 4.3 API Endpoints Design

#### Authentication
```
POST   /api/v1/auth/activate          # Activate license key
POST   /api/v1/auth/login             # Login (badge+pin or user+pass)
POST   /api/v1/auth/refresh           # Refresh JWT token
POST   /api/v1/auth/biometric/setup   # Setup biometric authentication
POST   /api/v1/auth/biometric/verify  # Verify biometric
POST   /api/v1/auth/logout            # Logout & invalidate token
```

#### Attendance
```
GET    /api/v1/attendance              # List attendance records
POST   /api/v1/attendance/checkin      # Check in (with location)
POST   /api/v1/attendance/checkout     # Check out (with location)
GET    /api/v1/attendance/sheets       # List attendance sheets
GET    /api/v1/attendance/sheets/:id   # Sheet detail
GET    /api/v1/attendance/calendar     # Calendar view data
GET    /api/v1/attendance/status       # Current check-in status
```

#### Leaves
```
GET    /api/v1/leaves                  # List leave requests
POST   /api/v1/leaves                  # Create leave request
GET    /api/v1/leaves/:id              # Leave detail
PUT    /api/v1/leaves/:id              # Update leave request
DELETE /api/v1/leaves/:id              # Delete draft leave
POST   /api/v1/leaves/:id/submit      # Submit for approval
POST   /api/v1/leaves/:id/approve     # Manager approve
POST   /api/v1/leaves/:id/validate    # HR validate (2nd level)
POST   /api/v1/leaves/:id/refuse      # Refuse
POST   /api/v1/leaves/:id/reset       # Reset to draft
GET    /api/v1/leaves/balance          # Leave balances by type
GET    /api/v1/leaves/allocations      # Manager: team allocations
POST   /api/v1/leaves/allocations      # Request allocation
```

#### Payslip
```
GET    /api/v1/payslips                # List payslips
GET    /api/v1/payslips/:id            # Payslip detail
GET    /api/v1/payslips/:id/pdf        # Download PDF
POST   /api/v1/payslips/:id/share     # Share via email
```

#### Expenses
```
GET    /api/v1/expenses                # List expenses
POST   /api/v1/expenses               # Create expense
GET    /api/v1/expenses/:id            # Expense detail
PUT    /api/v1/expenses/:id            # Update expense
DELETE /api/v1/expenses/:id            # Delete draft expense
POST   /api/v1/expenses/:id/submit    # Submit (create report)
POST   /api/v1/expenses/:id/approve   # Approve
POST   /api/v1/expenses/:id/refuse    # Refuse
POST   /api/v1/expenses/upload        # Upload receipt file
GET    /api/v1/expenses/categories     # Expense categories
GET    /api/v1/expenses/currencies     # Available currencies
```

#### Loans
```
GET    /api/v1/loans                   # List loans
POST   /api/v1/loans                   # Create loan application
GET    /api/v1/loans/:id               # Loan detail
PUT    /api/v1/loans/:id               # Update loan
DELETE /api/v1/loans/:id               # Delete draft loan
POST   /api/v1/loans/:id/submit       # Submit for approval
POST   /api/v1/loans/:id/approve/mgr  # Manager approve
POST   /api/v1/loans/:id/approve/hr   # HR approve
POST   /api/v1/loans/:id/approve/ceo  # CEO approve
POST   /api/v1/loans/:id/refuse       # Refuse
GET    /api/v1/loans/eligibility       # Check loan eligibility
```

#### Advance Salary
```
GET    /api/v1/advance-salary          # List requests
POST   /api/v1/advance-salary          # Create request
GET    /api/v1/advance-salary/:id      # Detail
PUT    /api/v1/advance-salary/:id      # Update
DELETE /api/v1/advance-salary/:id      # Delete draft
POST   /api/v1/advance-salary/:id/submit   # Submit
POST   /api/v1/advance-salary/:id/approve  # Approve
POST   /api/v1/advance-salary/:id/refuse   # Refuse
POST   /api/v1/advance-salary/:id/resubmit # Resubmit
GET    /api/v1/advance-salary/max-amount    # Max allowed amount
```

#### HR Letters
```
GET    /api/v1/hr-letters              # List
POST   /api/v1/hr-letters              # Create
GET    /api/v1/hr-letters/:id          # Detail
PUT    /api/v1/hr-letters/:id          # Update
DELETE /api/v1/hr-letters/:id          # Delete draft
POST   /api/v1/hr-letters/:id/submit   # Submit
POST   /api/v1/hr-letters/:id/approve  # Approve
POST   /api/v1/hr-letters/:id/refuse   # Refuse
POST   /api/v1/hr-letters/:id/resubmit # Resubmit
```

#### Document Requests
```
GET    /api/v1/documents               # List
POST   /api/v1/documents               # Create
GET    /api/v1/documents/:id           # Detail
PUT    /api/v1/documents/:id           # Update
DELETE /api/v1/documents/:id           # Delete draft
POST   /api/v1/documents/:id/submit    # Submit
POST   /api/v1/documents/:id/approve   # Approve
POST   /api/v1/documents/:id/refuse    # Refuse
POST   /api/v1/documents/:id/resubmit  # Resubmit
```

#### Experience Certificates
```
GET    /api/v1/certificates            # List
POST   /api/v1/certificates            # Create
GET    /api/v1/certificates/:id        # Detail
PUT    /api/v1/certificates/:id        # Update
DELETE /api/v1/certificates/:id        # Delete draft
POST   /api/v1/certificates/:id/submit   # Submit
POST   /api/v1/certificates/:id/approve  # Approve
POST   /api/v1/certificates/:id/refuse   # Refuse
POST   /api/v1/certificates/:id/resubmit # Resubmit
```

#### Business Services
```
GET    /api/v1/business-services       # List
POST   /api/v1/business-services       # Create
GET    /api/v1/business-services/:id   # Detail
PUT    /api/v1/business-services/:id   # Update
DELETE /api/v1/business-services/:id   # Delete draft
POST   /api/v1/business-services/:id/submit   # Submit
POST   /api/v1/business-services/:id/approve  # Approve
POST   /api/v1/business-services/:id/refuse   # Refuse
POST   /api/v1/business-services/:id/resubmit # Resubmit
GET    /api/v1/business-services/types         # Service types
```

#### Profile & Team
```
GET    /api/v1/profile                 # Employee profile
PUT    /api/v1/profile                 # Update profile
GET    /api/v1/profile/picture         # Profile picture
PUT    /api/v1/profile/picture         # Update picture
GET    /api/v1/team                    # Manager: team list
GET    /api/v1/team/:id/status         # Team member status
GET    /api/v1/team/attendance         # Team attendance overview
```

#### Engagement
```
GET    /api/v1/announcements           # Company announcements
GET    /api/v1/announcements/:id       # Announcement detail
POST   /api/v1/chat/messages           # Send HR chat message
GET    /api/v1/chat/messages           # Get chat history
GET    /api/v1/notes                   # Personal notes
POST   /api/v1/notes                   # Create note
PUT    /api/v1/notes/:id              # Update note
DELETE /api/v1/notes/:id              # Delete note
POST   /api/v1/mood                    # Submit daily mood
```

#### Notifications & Settings
```
POST   /api/v1/notifications/register  # Register push token
GET    /api/v1/notifications           # Get notifications list
PUT    /api/v1/notifications/:id/read  # Mark as read
GET    /api/v1/settings                # Get app settings
PUT    /api/v1/settings                # Update settings
GET    /api/v1/companies               # Available companies
PUT    /api/v1/companies/switch        # Switch company
```

#### Analytics (Manager)
```
GET    /api/v1/analytics/attendance    # Attendance trends
GET    /api/v1/analytics/leaves        # Leave analytics
GET    /api/v1/analytics/overtime      # Overtime report
GET    /api/v1/analytics/absenteeism   # Absenteeism trends
```

#### Tasks
```
GET    /api/v1/tasks                              # List my assigned tasks
GET    /api/v1/tasks/:id                           # Task detail
PUT    /api/v1/tasks/:id/stage                     # Update task stage (New→In Progress→Done)
PUT    /api/v1/tasks/:id/priority                  # Update task priority
GET    /api/v1/tasks/:id/attachments               # List task attachments
POST   /api/v1/tasks/:id/attachments               # Upload attachment to task
DELETE /api/v1/tasks/:id/attachments/:att_id        # Delete attachment
GET    /api/v1/tasks/stages                        # Get available stages
GET    /api/v1/tasks/projects                      # Get my projects list
```

#### Timesheets
```
GET    /api/v1/timesheets                          # List my timesheet entries (date range)
POST   /api/v1/timesheets                          # Create manual time entry
PUT    /api/v1/timesheets/:id                      # Update time entry
DELETE /api/v1/timesheets/:id                      # Delete time entry
GET    /api/v1/timesheets/summary                  # Weekly/monthly summary with totals
GET    /api/v1/timesheets/team                     # Manager: team timesheet summary
GET    /api/v1/timesheets/team/:employee_id        # Manager: specific employee timesheets
```

#### Timer
```
POST   /api/v1/timer/start                         # Start timer on a task
POST   /api/v1/timer/stop                          # Stop timer → auto-creates timesheet entry
GET    /api/v1/timer/status                        # Get current active timer (if any)
POST   /api/v1/timer/pause                         # Pause active timer
POST   /api/v1/timer/resume                        # Resume paused timer
```

> **Timer Implementation Note:** Timer state is stored in middleware (Redis/PostgreSQL), not in Odoo. When the timer is stopped, the middleware calculates the elapsed duration and creates an `account.analytic.line` entry in Odoo. Only one active timer per employee is allowed. The mobile app displays a persistent mini-timer bar while a timer is running, and on app resume it re-syncs with the server via GET `/api/v1/timer/status`.

**Total API Endpoints: ~145+**

---

## 5. ODOO INTEGRATION LAYER

### 5.1 Connection Method

**Primary: Odoo JSON-RPC API** (available in all Odoo versions)

```python
# Connection Configuration (per company/tenant)
{
    "odoo_url": "https://client-odoo.example.com",
    "database": "client_db",
    "service_user": "ess_api_service@company.com",
    "service_password": "encrypted_password",
    "timeout": 30,
    "max_retries": 3
}
```

### 5.2 Service User Setup

One Odoo user account per client company:
- Username: `ess_mobile_api@company.com`
- Groups: HR Manager, Attendance Manager, Payroll Manager, Expense Manager
- Purpose: Execute all mobile app operations on behalf of employees
- Employee mapping: Middleware maps Badge ID/PIN to employee_id, then uses service user to read/write data filtered by that employee_id

### 5.3 Odoo Model Mapping

| Mobile App Feature | Odoo Model | Key Fields |
|-------------------|------------|------------|
| Attendance | hr.attendance | employee_id, check_in, check_out |
| Attendance Sheet | attendance.sheet | employee_id, line_ids, state |
| Leave Request | hr.leave | employee_id, holiday_status_id, date_from, date_to, state |
| Leave Type | hr.leave.type | name, request_unit, max_leaves |
| Leave Allocation | hr.leave.allocation | employee_id, holiday_status_id, number_of_days |
| Payslip | hr.payslip | employee_id, date_from, date_to, state, line_ids |
| Expense | hr.expense | employee_id, product_id, total_amount, state |
| Loan | hr.loan | employee_id, loan_amount, installment, state |
| Advance Salary | advance.salary | employee_id, request_amount_q, state |
| HR Letter | hr.letter | employee_id, directed_to, salary_type, state |
| Document Request | document.request | employee_id, type_of_doc, state |
| Experience Cert | experience.certification | employee_id, directed_to, state |
| Business Service | business.services | employee_id, type_of_service, state |
| Task | project.task | name, project_id, stage_id, user_ids, date_deadline, priority, description |
| Task Stage | project.task.type | name, sequence, fold |
| Project | project.project | name, user_id, date_start, date |
| Timesheet Entry | account.analytic.line | employee_id, task_id, project_id, unit_amount, date, name |
| Employee | hr.employee | name, badge_id, pin, parent_id, department_id |
| Contract | hr.contract | employee_id, basic_salary, max_loan_amount |

### 5.4 Odoo Custom Module Requirements

A small companion Odoo module is needed to:
1. Add `badge_id` and `pin` fields to `hr.employee` (if not already present)
2. Create API-specific methods for mobile app operations
3. Add webhook triggers for push notifications (on approval, refusal, etc.)
4. Expose face recognition reference data
5. Store geofence coordinates per work location

---

## 6. AUTHENTICATION & LICENSING SYSTEM

### 6.1 License Model

```
┌─────────────────────────────────────────────────────┐
│                 LICENSE STRUCTURE                     │
│                                                      │
│  Company License                                     │
│  ├── License Key: "XXXX-XXXX-XXXX-XXXX"            │
│  ├── Company Name: "ABC Corp"                       │
│  ├── Odoo URL: "https://abc.odoo.com"              │
│  ├── Tier: Basic / Standard / Premium               │
│  ├── Max Employees: 200                             │
│  ├── Expiry Date: 2027-03-10                        │
│  ├── Active Employees: 156                          │
│  ├── Enabled Modules: [attendance, leaves, ...]     │
│  └── Status: Active / Expired / Suspended           │
│                                                      │
│  Employee Activation                                 │
│  ├── Employee ID (from Odoo)                        │
│  ├── Badge ID                                       │
│  ├── PIN (hashed)                                   │
│  ├── Device ID                                      │
│  ├── Face Data Reference                            │
│  ├── Activation Date                                │
│  └── Status: Active / Deactivated                   │
└─────────────────────────────────────────────────────┘
```

### 6.2 License Tiers

| Feature | Basic | Standard | Premium |
|---------|:-----:|:--------:|:-------:|
| Attendance (check-in/out) | Yes | Yes | Yes |
| Attendance Sheets | Yes | Yes | Yes |
| Leave Management | Yes | Yes | Yes |
| Leave Balance | Yes | Yes | Yes |
| Payslip Viewing | Yes | Yes | Yes |
| Payslip Download/Share | - | Yes | Yes |
| Expenses | - | Yes | Yes |
| Loans | - | Yes | Yes |
| Advance Salary | - | Yes | Yes |
| HR Letters | - | - | Yes |
| Document Requests | - | - | Yes |
| Experience Certificates | - | - | Yes |
| Business Services | - | - | Yes |
| Manager Dashboard | - | Yes | Yes |
| Analytics | - | - | Yes |
| Announcements | - | Yes | Yes |
| HR Chat | - | - | Yes |
| Facial Recognition | - | - | Yes |
| Geofencing | - | Yes | Yes |
| Offline Mode | Yes | Yes | Yes |
| Push Notifications | Yes | Yes | Yes |
| Multi-Company | - | Yes | Yes |
| Dark Mode | Yes | Yes | Yes |
| **Price per employee/month** | $ | $$ | $$$ |

### 6.3 Authentication Methods

```
┌──────────────────────────────────────────────┐
│           AUTHENTICATION METHODS              │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │ Method 1: Badge ID + PIN               │ │
│  │ - Employee enters Badge ID (from card)  │ │
│  │ - Enters 4-6 digit PIN                 │ │
│  │ - Middleware validates against Odoo     │ │
│  │ - Returns JWT token                     │ │
│  │ - No Odoo user license needed           │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │ Method 2: Username + Password           │ │
│  │ - For users who have Odoo accounts      │ │
│  │ - Standard Odoo authentication          │ │
│  │ - Returns JWT token                     │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │ Method 3: Biometric (after first login) │ │
│  │ - Fingerprint or Face ID               │ │
│  │ - Unlocks stored JWT from secure store  │ │
│  │ - No network call needed               │ │
│  │ - Fallback to Badge/PIN if fails        │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │ Method 4: Face Recognition (Attendance) │ │
│  │ - Camera captures face                  │ │
│  │ - Compares with stored reference        │ │
│  │ - Used specifically for check-in/out    │ │
│  │ - Prevents buddy punching              │ │
│  └─────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

### 6.4 JWT Token Structure

```json
{
  "sub": "employee_123",
  "company_id": "abc_corp",
  "odoo_employee_id": 45,
  "badge_id": "EMP-045",
  "role": "employee|manager|hr_admin",
  "tier": "premium",
  "modules": ["attendance", "leaves", "payslip", "loans", ...],
  "iat": 1710000000,
  "exp": 1710086400
}
```

---

## 7. DATABASE ARCHITECTURE

### 7.1 Middleware Database (PostgreSQL)

```sql
-- Company/Tenant Management
CREATE TABLE companies (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    license_key VARCHAR(50) UNIQUE NOT NULL,
    odoo_url VARCHAR(500) NOT NULL,
    odoo_database VARCHAR(100) NOT NULL,
    odoo_service_user VARCHAR(255) NOT NULL,
    odoo_service_password_encrypted TEXT NOT NULL,
    tier VARCHAR(20) NOT NULL,  -- basic, standard, premium
    max_employees INTEGER NOT NULL,
    license_expiry DATE NOT NULL,
    enabled_modules JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Employee Activations
CREATE TABLE employee_activations (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(id),
    odoo_employee_id INTEGER NOT NULL,
    badge_id VARCHAR(50) NOT NULL,
    pin_hash VARCHAR(255) NOT NULL,
    face_reference_data BYTEA,
    device_id VARCHAR(255),
    device_type VARCHAR(20),  -- ios, android
    push_token TEXT,
    last_login TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    activated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, badge_id)
);

-- Sessions
CREATE TABLE sessions (
    id UUID PRIMARY KEY,
    employee_activation_id UUID REFERENCES employee_activations(id),
    jwt_token_hash VARCHAR(255) NOT NULL,
    device_id VARCHAR(255),
    ip_address INET,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Push Notification Queue
CREATE TABLE push_notifications (
    id UUID PRIMARY KEY,
    employee_activation_id UUID REFERENCES employee_activations(id),
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    data JSONB,
    status VARCHAR(20) DEFAULT 'pending',  -- pending, sent, failed
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Offline Sync Queue
CREATE TABLE sync_queue (
    id UUID PRIMARY KEY,
    employee_activation_id UUID REFERENCES employee_activations(id),
    action_type VARCHAR(50) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',  -- pending, processing, completed, failed
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP
);

-- Audit Log
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(id),
    employee_activation_id UUID REFERENCES employee_activations(id),
    action VARCHAR(100) NOT NULL,
    model_name VARCHAR(100),
    record_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    device_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Announcements Cache
CREATE TABLE announcements (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(id),
    title VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal',
    published_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Chat Messages
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(id),
    employee_activation_id UUID REFERENCES employee_activations(id),
    direction VARCHAR(10) NOT NULL,  -- 'to_hr', 'from_hr'
    message TEXT NOT NULL,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Personal Notes (stored locally but optionally synced)
CREATE TABLE personal_notes (
    id UUID PRIMARY KEY,
    employee_activation_id UUID REFERENCES employee_activations(id),
    title VARCHAR(255),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Geofence Locations
CREATE TABLE geofence_locations (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(id),
    name VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 200,
    is_active BOOLEAN DEFAULT true
);

-- Employee Geofence Assignments
CREATE TABLE employee_geofences (
    id UUID PRIMARY KEY,
    employee_activation_id UUID REFERENCES employee_activations(id),
    geofence_location_id UUID REFERENCES geofence_locations(id)
);
```

### 7.2 Local Mobile Database (SQLite)

```
Tables:
├── cached_profile         # Employee profile data
├── cached_attendance      # Recent attendance records
├── cached_leaves          # Recent leave requests
├── cached_payslips        # Payslip summaries (not full data)
├── cached_expenses        # Recent expenses
├── cached_loans           # Loan list
├── cached_requests        # HR letters, documents, certificates
├── offline_queue          # Actions queued while offline
├── notifications          # Received push notifications
├── personal_notes         # Local notes (primary storage)
├── app_settings           # User preferences
└── sync_metadata          # Last sync timestamps per entity
```

---

## 8. OFFLINE SYNC STRATEGY

### 8.1 Offline Capabilities

| Feature | Offline Read | Offline Write | Sync Priority |
|---------|:----------:|:------------:|:-------------:|
| Dashboard | Yes (cached) | N/A | Medium |
| Attendance Check-in | Yes (status) | Yes (queued) | HIGH |
| Attendance History | Yes (cached) | N/A | Low |
| Leave Balance | Yes (cached) | N/A | Medium |
| Leave Request | Yes (list) | Yes (queued) | HIGH |
| Payslip | Yes (if downloaded) | N/A | Low |
| Expenses | Yes (drafts) | Yes (queued) | Medium |
| Loan | Yes (list) | Yes (queued) | Medium |
| Advance Salary | Yes (list) | Yes (queued) | Medium |
| HR Letters | Yes (list) | Yes (queued) | Low |
| Profile | Yes (cached) | N/A | Low |
| Notes | Yes (local) | Yes (local) | Low |
| Notifications | Yes (cached) | N/A | Medium |

### 8.2 Sync Flow

```
App comes online (or periodic sync every 5 min)
    │
    ├── 1. Process Offline Queue (FIFO)
    │       ├── Send queued attendance punches
    │       ├── Send queued leave requests
    │       ├── Send queued expense claims
    │       └── Mark completed / retry failed
    │
    ├── 2. Pull Updated Data
    │       ├── Check for new notifications
    │       ├── Refresh leave balances
    │       ├── Refresh attendance status
    │       ├── Refresh request statuses
    │       └── Update profile if changed
    │
    └── 3. Resolve Conflicts
            ├── Server wins for status changes
            ├── Notify user of conflicts
            └── Log conflict resolution
```

### 8.3 Conflict Resolution Rules

1. **Attendance**: Queued punches are always applied (with offline timestamp)
2. **Leave Requests**: If leave was already approved/refused while offline, discard queued changes
3. **Expenses**: Draft changes overwrite server draft; submitted records are read-only
4. **Status Changes**: Server status always wins (approval/refusal happened while offline)

---

## 9. PUSH NOTIFICATION SYSTEM

### 9.1 Notification Types

| Event | Recipient | Priority |
|-------|-----------|----------|
| Leave Approved | Employee | High |
| Leave Refused | Employee | High |
| Loan Approved (any level) | Employee | High |
| Loan Refused | Employee | High |
| Expense Approved | Employee | Medium |
| Advance Salary Approved | Employee | High |
| New Leave Request (pending) | Manager | High |
| New Loan Request (pending) | Manager/HR/CEO | High |
| New Announcement | All employees | Medium |
| HR Chat Message | Employee/HR | High |
| Check-in Reminder | Employee | Medium |
| Check-out Reminder | Employee | Medium |
| License Expiring Soon | Admin | High |
| Payslip Available | Employee | Medium |

### 9.2 Implementation

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    Odoo      │     │  Middleware   │     │    FCM/APNs  │
│  (Webhook)   │────>│  Push Service │────>│  (Google/    │
│              │     │              │     │   Apple)     │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                                                  ▼
                                           ┌──────────────┐
                                           │  Mobile App  │
                                           │  (Receives   │
                                           │   push)      │
                                           └──────────────┘
```

**Trigger Sources:**
1. **Odoo Webhooks** - When status changes (write override on models to call webhook)
2. **Middleware Scheduled Jobs** - Check-in/out reminders, license expiry alerts
3. **Direct** - HR chat messages, announcements

---

## 10. SECURITY ARCHITECTURE

### 10.1 Data Security

| Layer | Protection |
|-------|-----------|
| Transport | HTTPS/TLS 1.3 for all communications |
| Authentication | JWT with RS256 signing, 24h expiry |
| Token Storage | iOS Keychain / Android Keystore (hardware-backed) |
| PIN Storage | bcrypt hashed (never stored in plaintext) |
| Face Data | Stored as encrypted reference, compared server-side or on-device |
| API Keys | Encrypted at rest in middleware database |
| Database | Encrypted at rest (PostgreSQL TDE or cloud encryption) |
| Offline Data | SQLite with SQLCipher encryption |
| File Storage | Encrypted file system on device |

### 10.2 Access Control Matrix

```
┌──────────────────────────────────────────────────────────┐
│                   ACCESS CONTROL                          │
│                                                           │
│  Employee:                                                │
│  ├── Read: Own records only                              │
│  ├── Create: Own requests (leaves, expenses, loans...)   │
│  ├── Update: Own draft records only                      │
│  ├── Delete: Own draft records only                      │
│  └── Actions: Submit, Resubmit                           │
│                                                           │
│  Manager:                                                 │
│  ├── Read: Own + subordinate records                     │
│  ├── Create: Own requests only                           │
│  ├── Update: Own draft records only                      │
│  ├── Delete: Own draft records only                      │
│  └── Actions: Approve, Refuse (subordinate records)      │
│                                                           │
│  HR Admin:                                                │
│  ├── Read: All employee records                          │
│  ├── Create: Announcements, allocations                  │
│  ├── Update: Limited admin fields                        │
│  ├── Delete: N/A (no deletion rights)                    │
│  └── Actions: Validate (2nd level), Chat responses       │
│                                                           │
│  Company Admin:                                           │
│  ├── All HR Admin permissions                            │
│  ├── License management                                  │
│  ├── Employee activation/deactivation                    │
│  └── Geofence configuration                              │
└──────────────────────────────────────────────────────────┘
```

### 10.3 Geofencing Security

```
Check-in Request Flow:
1. App captures GPS coordinates
2. Sends to middleware with check-in request
3. Middleware looks up employee's assigned geofence locations
4. Calculates distance using Haversine formula
5. If within radius: Allow check-in
6. If outside radius: Reject with error message
7. Log location regardless (for audit)
```

### 10.4 Face Recognition Security

```
Options:
A. On-Device (Recommended for privacy):
   - Face reference stored encrypted on device
   - Comparison done locally using ML Kit / Vision framework
   - Only pass/fail result sent to server
   - Pros: Fast, works offline, privacy-preserving
   - Cons: Reference must be synced to new devices

B. Server-Side:
   - Face image sent to middleware
   - Compared against stored reference using AWS Rekognition / Azure Face
   - Result returned to app
   - Pros: Centralized, harder to spoof
   - Cons: Slower, requires internet, privacy concerns
```

---

## 11. DEPLOYMENT ARCHITECTURE

### 11.1 Cloud Infrastructure

```
┌─────────────────────────────────────────────────────┐
│                CLOUD DEPLOYMENT                      │
│            (AWS / Azure / GCP / DO)                  │
│                                                      │
│  ┌──────────────────────────────────────────┐       │
│  │           Load Balancer (HTTPS)           │       │
│  └──────────────────┬───────────────────────┘       │
│                     │                                │
│  ┌──────────────────┴───────────────────────┐       │
│  │        API Middleware (Docker)             │       │
│  │     ┌─────────┐  ┌─────────┐             │       │
│  │     │ Node 1  │  │ Node 2  │  (auto-scale)│      │
│  │     └─────────┘  └─────────┘             │       │
│  └──────────────────────────────────────────┘       │
│                     │                                │
│  ┌──────────────────┴───────────────────────┐       │
│  │                                           │       │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  │       │
│  │  │PostgreSQL│  │  Redis  │  │   S3    │  │       │
│  │  │(Database)│  │ (Cache) │  │ (Files) │  │       │
│  │  └─────────┘  └─────────┘  └─────────┘  │       │
│  │                                           │       │
│  └───────────────────────────────────────────┘       │
│                                                      │
│  ┌──────────────────────────────────────────┐       │
│  │  Monitoring: Grafana + Prometheus         │       │
│  │  Logging: ELK Stack / CloudWatch          │       │
│  │  CI/CD: GitHub Actions / GitLab CI        │       │
│  └──────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────┘
```

### 11.2 Mobile App Distribution

| Platform | Store | Update Strategy |
|----------|-------|----------------|
| iOS | Apple App Store | Standard review + CodePush for minor updates |
| Android | Google Play | Standard review + CodePush for minor updates |
| Internal | Enterprise Distribution | Direct APK/IPA for testing |

---

## 12. THIRD-PARTY INTEGRATIONS

### 12.1 Required Integrations

| Service | Purpose | Provider Options |
|---------|---------|-----------------|
| Push Notifications | FCM + APNs | Firebase Cloud Messaging |
| Face Recognition | Attendance verification | Google ML Kit (on-device), AWS Rekognition (cloud) |
| Geolocation | GPS for attendance | Native device GPS |
| Maps | Geofence visualization | Google Maps API, Mapbox |
| File Storage | Receipts, attachments | AWS S3, Cloudinary |
| PDF Generation | Payslip reports | Odoo report engine (server-side) |
| Email | Payslip sharing | SendGrid, AWS SES |
| WhatsApp | Payslip sharing | WhatsApp Business API or native share |
| Analytics | App usage tracking | Firebase Analytics, Mixpanel |
| Crash Reporting | Error monitoring | Firebase Crashlytics, Sentry |
| Calendar | Hijri/Gregorian | Umm al-Qura calendar library |

---

## APPENDIX: TECHNOLOGY DECISION MATRIX

| Decision | Selected | Reasoning |
|----------|----------|-----------|
| Mobile Framework | React Native (TypeScript) | Large ecosystem, TypeScript, hot reload, web code sharing |
| State Management | Redux Toolkit + React Query | Predictable state, server cache, DevTools, wide adoption |
| Local DB | SQLite via WatermelonDB (op-sqlite) | Embedded SQLite, high-performance, reactive, designed for React Native |
| API Framework | Django REST Framework (Python) | Mature ecosystem, ORM, admin panel, Celery integration |
| Middleware DB | PostgreSQL | Relational data, JSONB flexibility |
| Cache | Redis | Pub/sub for notifications, TTL support |
| Cloud | AWS | Mature, region availability (MENA) |
| CI/CD | GitHub Actions | Integration with code hosting |
| Monitoring | Grafana + Prometheus | Cost-effective, self-hosted option |

---

*Architecture Plan v1.0 - Subject to refinement during implementation*
