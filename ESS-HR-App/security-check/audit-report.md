# ESS HR API Security Audit Report

**Date:** 2026-07-01  
**Scope:** 69 active endpoints across 20 controller files and 17 model files  
**Module:** `ess_hr_client` (Odoo 19)

---

## Executive Summary

All routes go through `call_and_log()` — the uniform entry point is a genuine strength. No SQL injection was found (ORM used throughout). No raw credentials are returned in responses. Field allowlists are applied on all write paths.

**3 Critical · 4 High · 5 Medium · 4 Low**

---

## 🔴 Critical

### C-1 — Tokens are never validated server-side
`call_and_log` only checks that a Bearer token is *present* — it never verifies the value matches anything stored. Authentication effectively reduces to: "does the request have any non-empty token + a plausible `employee_id`?"  
**Fix:** Store issued tokens in `ess.employee.credential` or a session table; validate on every request.

### C-2 — IDOR on salary, contract, and leave-balance data
`/ess/api/advance-salary/info`, `/ess/api/profile/contract`, and `/ess/api/leave/balances` all query by the `X-ESS-Employee-ID` header, which is never cross-checked against the token. Any authenticated user who knows a colleague's numeric `employee_id` can read their wage and leave allocation.  
**Fix:** The token must encode `employee_id` server-side; validate at the gateway.

### C-3 — Token revocation does not exist
`POST /auth/refresh` returns `{"refreshed": true}` without issuing a new token. `POST /auth/logout` returns `{"logged_out": true}` without invalidating anything. A stolen token remains valid indefinitely.  
**Fix:** Implement server-side token storage and invalidation on logout/refresh.

---

## 🟠 High

### H-1 — 6 approval endpoints accept any authenticated employee as approver
Loans, advance salary, HR letters, document requests, experience certificates, and business services check only that the approver `employee_id` exists — no manager relationship or HR group check.  
**Fix:** Add `require_hr_or_admin()` or a manager-relationship check to each approve/refuse method.

### H-2 — `/ess/api/leave/validate` has no role check
Any authenticated employee can second-level approve any leave request.  
**Fix:** Add HR group check before calling `action_validate()`.

### H-3 — `/ess/api/leave/refuse` has no manager identity check
Calls `action_refuse()` as SUPERUSER without verifying the caller is the assigned manager or HR. Compare with `approve_leave`, which correctly validates `leave_manager_id` / `parent_id` — the same pattern must be applied here.  
**Fix:** Mirror the identity check from `approve_leave`.

### H-4 — `/ess/api/stats` admin key defaults to open access
When `ess.admin.api.key` is not configured, `_validate_admin_api_key()` accepts any request that includes the header — even with an empty value. This exposes the full employee roster, badge IDs, and installed module list.  
**Fix:** Invert the default — an unconfigured key means DENY, not allow.

---

## 🟡 Medium

### M-1 — PIN and password hashed with unsalted SHA-256
GPU-crackable. Should use argon2id or bcrypt.

### M-2 — `/ess/api/attendance/check-out` bypasses `call_and_log` on early exceptions
An outer `try/except` catches errors before `call_and_log` runs, skipping audit logging and using naive string interpolation in the error response.  
**Fix:** Remove the outer wrapper; let `call_and_log` handle all exceptions.

### M-3 — No file type or size validation on expense attachment upload
`/ess/api/expenses/attach` accepts arbitrary filenames and base64 blobs with no MIME type check or size limit.

### M-4 — Single global API key with no per-device identity or rotation
One compromised key grants access for all clients with no way to revoke a single device.

### M-5 — Client-supplied timestamps accepted without server-side range guard
Check-in/check-out timestamps are passed by the client and accepted without validation. Employees can back-fill attendance for arbitrary past dates.  
**Fix:** Reject timestamps older than a configurable window (e.g., 5 minutes).

---

## 🔵 Low

### L-1 — No rate limiting or lockout on the login endpoint
A 4-digit PIN is brute-forceable with no throttling in place.

### L-2 — `company_id` accepted from request body
Several endpoints (announcements, employee directory, business service types) accept `company_id` from the request body, potentially leaking cross-company data in multi-company setups.

### L-3 — `UserError` messages returned verbatim
Error responses include the submitted `employee_id`, aiding enumeration.

### L-4 — Tasks/Timesheets routes registered but disabled
When `_FEATURES_ENABLED = True` is set, `update_task_stage` and `delete_timesheet` have no ownership checks.

---

## ✅ What Is Working Well

- Every active route goes through `call_and_log()` — no route bypasses the central guard
- All PATCH/update methods use explicit field allowlists — no mass assignment
- No raw SQL anywhere — ORM used throughout
- All ID-parameterised resource endpoints call `check_record_access()` before reading/writing
- Credential hashes are group-restricted and never returned in responses
- `approve_leave` correctly validates manager identity (the pattern to follow for H-1/H-2/H-3 fixes)
- Savepoint-guarded leave creation prevents half-committed records

---

## Priority Fix Order

| Priority | Issue | Effort |
|----------|-------|--------|
| 1 | C-1: Token validation server-side | High |
| 2 | C-2: IDOR on sensitive endpoints | Medium |
| 3 | C-3: Token revocation on logout | Medium |
| 4 | H-2: leave/validate role check | Low |
| 5 | H-3: leave/refuse manager check | Low |
| 6 | H-1: Other approval endpoints | Medium |
| 7 | H-4: Stats key default deny | Low |
| 8 | M-1: PIN hashing (argon2id) | Medium |
| 9 | M-5: Timestamp range guard | Low |
| 10 | L-1: Login rate limiting | Medium |

---

## SUPERUSER Usage Summary

`SUPERUSER_ID` / `.sudo()` is used extensively throughout all model methods for reading and writing. This is intentional — the module uses `auth='none'` on all routes and manages its own auth layer via headers. The risk is not the SUPERUSER usage itself but the auth layer above it (see C-1, C-2). If the auth layer is bypassed or spoofed, SUPERUSER gives attackers full write access to all records.
