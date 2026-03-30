# ESS Mobile App — Technical Architecture Plan

---
**Version:** 2.0
**Date:** 2026-03-30
**Status:** Active — Updated Architecture

---

## TABLE OF CONTENTS

1. [System Overview](#1-system-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Login Flow](#3-login-flow)
4. [Mobile App Layer](#4-mobile-app-layer)
5. [ESS Admin Module (Odoo)](#5-ess-admin-module-odoo)
6. [ESS Client Module (Odoo)](#6-ess-client-module-odoo)
7. [Data Flow Summary](#7-data-flow-summary)
8. [License & Module Control](#8-license--module-control)
9. [Auto Logout & Session Config](#9-auto-logout--session-config)
10. [Server URL Caching](#10-server-url-caching)
11. [Security Architecture](#11-security-architecture)
12. [Critical Rules](#12-critical-rules)

---

## 1. SYSTEM OVERVIEW

### 1.1 High-Level Architecture

The system follows a **3-actor architecture** with no Django middleware:

```
┌──────────────────────────────────────────────────────┐
│                    MOBILE APP                         │
│              (iOS + Android — React Native)           │
│                                                       │
│  Step 1: Validate → Admin Server (fixed in .env)      │
│  Step 2: Login    → Client Server (URL from Step 1)   │
│  Step 3: Data     → Client Server (all business data) │
└───────────────┬───────────────────────┬───────────────┘
                │ Step 1                │ Step 2 & 3
                ▼                       ▼
┌───────────────────────┐   ┌───────────────────────────┐
│  ESS ADMIN SERVER     │   │  ESS CLIENT SERVER        │
│  (Odoo + Admin Module)│   │  (Odoo + Client Module)   │
│                       │   │                           │
│  - License manager    │   │  - All business logic     │
│  - Module control     │   │  - Employee auth (Step 2) │
│  - Server registry    │   │  - All API endpoints      │
│  - Stats collection   │   │  - Expose stats to admin  │
│  - Auto-deactivation  │   │                           │
│                       │   │  One module installed     │
│  URL saved in .env    │   │  per client Odoo server   │
└───────────────────────┘   └───────────────────────────┘
```

### 1.2 Design Principles

1. **Two Odoo modules** — `ess_hr_admin` and `ess_hr_client` are completely separate addons installed on separate Odoo servers
2. **Admin is the gatekeeper** — every login starts with admin validation; no admin = no login
3. **Client is the data source** — all business data and employee auth comes from the client server
4. **Server URL is dynamic** — mobile app uses whatever server URL was validated, not a hardcoded `.env` URL
5. **Module visibility controlled by admin** — allowed modules come from the license; mobile shows only what is enabled
6. **No Django middleware** — direct mobile-to-Odoo REST communication
7. **Bilingual native** — Arabic RTL and English LTR throughout

---

## 2. ARCHITECTURE DIAGRAM

### 2.1 Component Map

```
.env (mobile)
  └── ADMIN_SERVER_URL = https://admin.ess-system.com/ess/api
  └── (no client URL here — comes from login)

Mobile App
  ├── Cache: previously used server URLs (for quick re-login)
  ├── Cache: auto-logout duration (overridden on each login)
  └── Redux: serverUrl, allowedModules, accessToken, user, companyId

Admin Odoo Server  (one shared instance)
  └── ess_hr_admin module
        ├── ess.license         (license per client server)
        ├── ess.server          (registered client servers)
        ├── ess.module          (available modules, name + code)
        └── Scheduled Actions   (daily stats fetch + limit checks)

Client Odoo Server  (one per customer)
  └── ess_hr_client module
        ├── All business REST API endpoints
        ├── Employee authentication
        ├── /ess/api/admin/stats  (exposes stats to admin)
        └── Employee Credentials management (in employee screen)
```

---

## 3. LOGIN FLOW

### 3.1 Step-by-Step

```
┌─────────────┐          ┌─────────────────┐       ┌──────────────────┐
│  Mobile App │          │  Admin Server   │       │  Client Server   │
└──────┬──────┘          └────────┬────────┘       └────────┬─────────┘
       │                          │                          │
       │  STEP 1                  │                          │
       │  POST /auth/validate     │                          │
       │  body: { server_url }    │                          │
       │─────────────────────────>│                          │
       │                          │  (no client contact      │
       │                          │   during Step 1)         │
       │  Response:               │                          │
       │  {                       │                          │
       │    status: valid,        │                          │
       │    allowed_modules: [],  │                          │
       │    auto_logout_hours: 72 │                          │
       │  }                       │                          │
       │<─────────────────────────│                          │
       │                          │                          │
       │  If Step 1 fails → STOP  │                          │
       │  If Step 1 OK → STEP 2   │                          │
       │                          │                          │
       │  STEP 2                  │                          │
       │  POST /ess/api/auth/login │                          │
       │  to: server_url (from Step 1)                       │
       │  body: { badge_id/username, pin/password, company } │
       │─────────────────────────────────────────────────── >│
       │                          │                          │
       │  Response:               │                          │
       │  { user, tokens, ... }   │                          │
       │<─────────────────────────────────────────────────── │
       │                          │                          │
       │  All subsequent calls → Client Server               │
       │─────────────────────────────────────────────────── >│
```

### 3.2 Step 1 — Admin Validation

- **Endpoint:** `POST {ADMIN_SERVER_URL}/auth/validate` (URL from `.env`)
- **Body:** `{ server_url: "https://client.company.com" }`
- **Admin checks:**
  1. `server_url` is registered in `ess.server`
  2. A license linked to that server is `active = True`
  3. License is not expired
  4. Employee count has not exceeded `max_employees + grace_limit`
- **Response on success:**
  ```json
  {
    "status": "valid",
    "allowed_modules": ["attendance", "leave", "payslip", "expense"],
    "auto_logout_hours": 72
  }
  ```
- **Response on failure:** specific error code (see §8)
- **Admin does NOT contact the client server during Step 1**

### 3.3 Step 2 — Client Login

- **Endpoint:** `POST {server_url}/ess/api/auth/login`
- **`server_url`** is the one entered by the user and validated in Step 1
- Returns: auth tokens + employee profile + company data
- All subsequent data calls go to this same `server_url`

---

## 4. MOBILE APP LAYER

### 4.1 What is Stored in `.env`

```
ADMIN_SERVER_URL=https://admin.ess-system.com/ess/api   # fixed, never changes
ACTIVE_BACKEND=odoo                                      # mock | odoo
MOCK_DELAY_MIN=300
MOCK_DELAY_MAX=800
```

**Not in `.env`:** client server URL — this comes dynamically from user input and Step 1 response.

### 4.2 Redux State

```typescript
auth: {
  serverUrl: string | null          // client server URL (from Step 1 validated input)
  allowedModules: string[]          // module codes from admin (e.g. ["attendance","leave"])
  autoLogoutHours: number           // from admin, cached
  accessToken: string | null
  refreshToken: string | null
  user: UserInfo | null
  companyId: number | null
  companyName: string | null
  isAuthenticated: boolean
}

connectivity: {
  serverDown: boolean               // true when client server is unreachable
}
```

### 4.3 Module Visibility

- On login completion, `allowedModules` from Step 1 is stored in Redux
- Every menu section / screen checks its module code against `allowedModules`
- If not in the list → hidden from menu AND navigation routes not registered
- Module codes are defined in `ess.module` on admin and matched in mobile by code string

### 4.4 Server URL Cache

- After a successful login, the server URL is saved to persistent local storage
- On the login screen (Step 1), previously used valid URLs are shown as quick-select buttons
- User can tap a cached URL instead of typing it again
- Cache stores: `{ url, lastUsed, companyName }` — not tokens

### 4.5 Auto Logout

- Default: 72 hours (3 days) hardcoded in app
- Overridden by `auto_logout_hours` received from admin in Step 1
- Cached value used on subsequent app opens until next successful Step 1
- On each app foreground, check if `(now - lastLoginTimestamp) > autoLogoutHours * 3600s`
- If exceeded → `clearAuth()` → redirect to login

### 4.6 API Client Routing

```
Step 1 call  → baseURL = ADMIN_SERVER_URL (from .env)
Step 2+ calls → baseURL = auth.serverUrl + "/ess/api"  (dynamic, from Redux)
```

---

## 5. ESS ADMIN MODULE (Odoo)

**Module name:** `ess_hr_admin`
**Installed on:** One shared admin Odoo server

### 5.1 Models

#### `ess.server`
| Field | Type | Description |
|---|---|---|
| name | Char | Server display name |
| url | Char (unique) | Client server base URL |
| active | Boolean | Whether server is active |
| last_sync | Datetime | Last stats fetch timestamp |
| employee_count | Integer | Fetched from client |
| active_user_count | Integer | Fetched from client |
| sync_status | Selection | `ok / unreachable / error` |
| sync_error | Char | Last error message |

#### `ess.license`
| Field | Type | Description |
|---|---|---|
| name | Char | License display name |
| server_ids | Many2many → ess.server | Authorized servers |
| module_ids | Many2many → ess.module | Allowed modules |
| max_employees | Integer | Licensed employee count |
| grace_employee_limit | Integer | Extra allowed above max (meaningful name: "grace limit") |
| auto_logout_hours | Integer | Session duration sent to mobile (default 72) |
| tier | Selection | basic / standard / premium |
| active | Boolean | |
| expiry_date | Date | |
| deactivation_reason | Char | Reason if auto-deactivated |

#### `ess.module`
| Field | Type | Description |
|---|---|---|
| name | Char | Display name (e.g. "Attendance") |
| code | Char (unique) | Machine code used in mobile (e.g. `attendance`) |
| active | Boolean | |

### 5.2 Scheduled Actions

- **Daily stats fetch** — for each active `ess.server`, call `/ess/api/admin/stats` on the client and update `employee_count`, `active_user_count`, `last_sync`, `sync_status`
- **Limit check** — after each fetch, if `employee_count > max_employees + grace_employee_limit`:
  - Set license `active = False`
  - Set `deactivation_reason = "Employee limit exceeded"`
- **Unreachable check** — if client server returns no response:
  - Set `sync_status = unreachable`
  - Set license `active = False`
  - Set `deactivation_reason = "Client server unreachable"`
- **Manual trigger** — each `ess.server` form has a button to run fetch + check immediately

### 5.3 Admin API Endpoints

```
POST /ess/api/auth/validate     ← Step 1 from mobile
  body: { server_url }
  returns: { status, allowed_modules, auto_logout_hours }
```

### 5.4 Admin Odoo Menu

```
ESS Admin
├── Monitoring
│   ├── Servers          (list + form with manual sync button)
│   ├── Licenses
│   └── API Logs
└── Configuration
    ├── Modules          (ess.module registry)
    └── Settings
```

---

## 6. ESS CLIENT MODULE (Odoo)

**Module name:** `ess_hr_client`
**Installed on:** Each customer's Odoo server

### 6.1 Responsibilities

- All business data API endpoints (attendance, leave, payslip, expense, loan, etc.)
- Employee authentication (Step 2)
- Exposes `/ess/api/admin/stats` for admin to collect metrics
- Employee credential management lives inside the employee record screen (not a separate model managed externally)

### 6.2 API Endpoints Exposed

```
Auth:
  POST /ess/api/auth/login
  POST /ess/api/auth/refresh
  POST /ess/api/auth/logout

Business (all require valid token):
  /ess/api/attendance/*
  /ess/api/leave/*
  /ess/api/payslip/*
  /ess/api/expense/*
  /ess/api/loan/*
  /ess/api/advance-salary/*
  /ess/api/hr-services/*
  /ess/api/employee/*
  /ess/api/notifications/*
  /ess/api/announcements/*
  /ess/api/personal-notes/*
  /ess/api/analytics/*

Admin stats (called by admin server, not mobile):
  GET /ess/api/admin/stats
  returns: { employee_count, active_user_count, server_name }
```

### 6.3 What is REMOVED from Client Module vs. Current Code

- `ess.license` model → moved entirely to admin module
- `ess.server` model → moved entirely to admin module
- License validation logic → moved entirely to admin module
- Employee credentials are now managed from the employee form screen in Odoo UI directly (no separate admin management screen)

---

## 7. DATA FLOW SUMMARY

```
Mobile ──── Step 1 ────────────────────> Admin Server
            { server_url }                  │
                                            │ check license, modules, limits
                                            │ (no client contact)
            { status, modules, logout } <───┘

Mobile ──── Step 2 ────────────────────> Client Server
            { credentials, company_id }      │
                                             │ authenticate employee
            { tokens, user, company }   <────┘

Mobile ──── Data calls ─────────────────> Client Server
            Authorization: Bearer token      │
                                             │ business logic
            { data }                    <────┘

Admin  ──── Background ─────────────────> Client Server
(daily)     GET /ess/api/admin/stats         │
                                             │
            { employee_count, users }   <────┘
            → check limits → deactivate if exceeded
```

---

## 8. LICENSE & MODULE CONTROL

### 8.1 License Status Codes (returned in Step 1 failure)

| Code | Meaning |
|---|---|
| `SERVER_NOT_FOUND` | server_url not registered in admin |
| `LICENSE_INACTIVE` | server found but no active license |
| `LICENSE_EXPIRED` | license exists but past expiry_date |
| `EMPLOYEE_LIMIT_EXCEEDED` | count > max + grace limit |
| `SERVER_UNREACHABLE` | client server could not be reached by mobile |

### 8.2 Module Codes (examples)

| Code | Module |
|---|---|
| `attendance` | Attendance |
| `leave` | Leave Management |
| `payslip` | Payslips |
| `expense` | Expenses |
| `loan` | Loans |
| `advance_salary` | Advance Salary |
| `hr_letters` | HR Letters |
| `document_requests` | Document Requests |
| `experience_certs` | Experience Certificates |
| `business_services` | Business Services |
| `analytics` | Analytics |
| `chat` | HR Chat |
| `personal_notes` | Personal Notes |

Codes are defined in `ess.module` on the admin server. Mobile matches against these codes to show/hide features.

---

## 9. AUTO LOGOUT & SESSION CONFIG

- **Default:** 72 hours (hardcoded in mobile as fallback)
- **Source:** `ess.license.auto_logout_hours` on admin, returned in Step 1
- **Mobile behavior:**
  - On successful Step 1 → update cached `autoLogoutHours`
  - On each app foreground → compare `now` vs `lastLoginTimestamp + autoLogoutHours`
  - If exceeded → `clearAuth()` → redirect to Step 1 screen

---

## 10. SERVER URL CACHING

- After a successful full login (Step 1 + Step 2), save the server URL to persistent storage
- Format: `[{ url, companyName, lastUsed }]` — last 5 entries max
- On Step 1 screen: show cached URLs as tappable chips below the URL input
- Tapping a chip fills the input and triggers Step 1 automatically
- On failed login, cached URL is NOT removed (user may just have connectivity issues)
- On explicit "forget this server" action, remove from cache

---

## 11. SECURITY ARCHITECTURE

- **Admin server URL** is hardcoded in `.env` — cannot be changed by user
- **Client server URL** is user-supplied and validated by admin before any auth
- **Tokens** are stored in secure storage (Keychain/Keystore)
- **Server URL cache** is stored in regular AsyncStorage (not sensitive)
- **No license keys exposed to users** — validation is URL-based only
- **Per-request license check** on client server (via `X-ESS-Server-URL` header)
- All communication over HTTPS

---

## 12. CRITICAL RULES

1. **Admin = gatekeeper** — Step 1 must succeed before Step 2 is attempted
2. **Client = data source** — all business data and auth come from the client server
3. **Admin does NOT contact client during login** — validation is purely local to admin
4. **Allowed modules + logout duration come from admin**, not client
5. **Mobile never uses `.env` URL for business data** — only for admin Step 1 call
6. **If license inactive/expired:** login blocked at Step 1; authenticated users get auto-logged out on next foreground check
7. **If admin cannot reach client during background sync:** license is deactivated with reason
8. **Employee credentials** are managed inside the client Odoo employee screen, not in a separate admin panel
9. **Module control is binary** — if a module code is not in `allowed_modules`, it is completely hidden in the mobile app (menu + navigation)
10. **Grace employee limit** (`grace_employee_limit`) allows a buffer above `max_employees`; exceeding both triggers auto-deactivation

---

## CHANGE LOG

| Version | Date | Summary |
|---|---|---|
| 1.0 | 2026-03-10 | Initial architecture with Django middleware |
| 2.0 | 2026-03-30 | Removed Django middleware; split Odoo module into `ess_hr_admin` + `ess_hr_client`; admin as Step 1 gatekeeper; dynamic client server URL; module control via license; auto-logout config; server URL caching |
