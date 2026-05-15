#!/usr/bin/env python3
"""
ESS HR Client API — Automated Test Suite
=========================================
Tests all REST API endpoints in the ess_hr_client Odoo module.

Usage:
    python3 test_ess_api.py [options]

Options:
    --base     Base URL of the Odoo server  (default: http://localhost:8055)
    --badge    Employee badge ID            (default: 001)
    --pin      Employee PIN                 (default: 1234)
    --company  Company ID                   (default: 1)
    --verbose  Print full response body on failure

Exit codes:
    0  All tests passed
    1  One or more tests failed
    2  Could not authenticate (login failed)

Requirements:
    pip install requests
"""
import sys
import io
import json
import time
import argparse
import requests

# Force UTF-8 output on Windows so Unicode chars (arrows, em-dashes) don't crash
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
elif sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# ── Colour helpers ─────────────────────────────────────────────────────────────

GREEN  = '\033[32m'
RED    = '\033[31m'
YELLOW = '\033[33m'
CYAN   = '\033[36m'
RESET  = '\033[0m'
BOLD   = '\033[1m'


def ok(msg):   return f'{GREEN}PASS{RESET}  {msg}'
def err(msg):  return f'{RED}FAIL{RESET}  {msg}'
def warn(msg): return f'{YELLOW}SKIP{RESET}  {msg}'
def hdr(msg):  return f'\n{BOLD}{CYAN}{msg}{RESET}'


# ── Test runner ────────────────────────────────────────────────────────────────

_results = []   # list of (label, passed, note)


def t(label, passed, note=''):
    """Record a test result and print it immediately."""
    _results.append((label, passed, note))
    if passed:
        print(ok(f'{label}  {note}'))
    else:
        print(err(f'{label}  {note}'))


def summary():
    """Print final summary and return exit code."""
    total  = len(_results)
    passed = sum(1 for _, p, _ in _results if p)
    failed = total - passed
    print(f'\n{"="*60}')
    print(f'  Results: {passed}/{total} passed', end='')
    if failed:
        print(f'  {RED}({failed} FAILED){RESET}')
        print('\nFailed tests:')
        for label, passed, note in _results:
            if not passed:
                print(f'  {RED}✗{RESET} {label}  {note}')
    else:
        print(f'  {GREEN}— all passed{RESET}')
    print('='*60)
    return 0 if failed == 0 else 1


# ── HTTP helpers ───────────────────────────────────────────────────────────────

SESSION = requests.Session()
BASE    = ''
HEADERS = {}
VERBOSE = False


def _headers(extra=None):
    h = dict(HEADERS)
    if extra:
        h.update(extra)
    return h


def call(method, path, body=None, no_auth=False, label=None):
    """
    Make an HTTP request and return (success, data, error_code, raw_response).
    success  — True if response JSON has {"success": true}
    data     — contents of response["data"] (or None)
    code     — error code string from response["error"]["code"] (or None)
    raw      — full parsed JSON dict
    """
    url = BASE + path
    h = {'Content-Type': 'application/json'}
    if not no_auth:
        h.update(HEADERS)
    try:
        if method == 'GET':
            resp = SESSION.get(url, headers=h, params=body or {}, timeout=15)
        elif method == 'POST':
            resp = SESSION.post(url, headers=h,
                                data=json.dumps(body or {}), timeout=15)
        elif method == 'PATCH':
            resp = SESSION.patch(url, headers=h,
                                 data=json.dumps(body or {}), timeout=15)
        elif method == 'DELETE':
            resp = SESSION.delete(url, headers=h, timeout=15)
        else:
            raise ValueError(f'Unknown method: {method}')
    except requests.exceptions.ConnectionError:
        return False, None, 'CONNECTION_ERROR', {}
    except requests.exceptions.Timeout:
        return False, None, 'TIMEOUT', {}

    try:
        raw = resp.json()
    except Exception:
        return False, None, 'INVALID_JSON', {}

    success = raw.get('success', False)
    data    = raw.get('data')
    code    = raw.get('error', {}).get('code') if not success else None

    if VERBOSE and not success and label:
        print(f'         Response: {json.dumps(raw)[:400]}')

    return success, data, code, raw


def check(label, method, path, body=None, no_auth=False,
          expect_success=True, allow_codes=None, note_fn=None):
    """
    Run one test: call the API and assert success/failure matches expectation.

    allow_codes — list of error codes that are acceptable even when
                  expect_success=True (e.g. FEATURE_DISABLED).
    note_fn     — callable(data) → str, used to build the note from response data.
    Returns data on success (useful for chained tests).
    """
    success, data, code, raw = call(method, path, body, no_auth, label)

    if allow_codes and code in allow_codes:
        # Treat as a conditional skip
        t(label, True, f'({code})')
        return data

    passed = (success == expect_success)
    note = ''
    if success and data is not None and note_fn:
        note = note_fn(data)
    if not success and code:
        note = f'[{code}]'

    t(label, passed, note)
    return data if passed else None


# ── Auth ───────────────────────────────────────────────────────────────────────

def do_login(badge_id, pin, company_id):
    """Login and configure global HEADERS. Returns (token, emp_id, refresh_token)."""
    success, data, code, _ = call(
        'POST', '/ess/api/auth/login',
        {'badge_id': badge_id, 'pin': pin, 'company_id': company_id},
        no_auth=True,
    )
    if not success or not data:
        print(f'{RED}LOGIN FAILED [{code}] — cannot run tests{RESET}')
        return None, None, None

    tokens  = data.get('tokens', {})
    token   = tokens.get('access_token', '')
    refresh = tokens.get('refresh_token', '')
    emp_id  = data.get('user', {}).get('id')

    global HEADERS
    HEADERS = {
        'Authorization':         f'Bearer {token}',
        'X-ESS-Company-ID':      str(company_id),
        'X-ESS-Employee-ID':     str(emp_id),
        'X-ESS-Login-Mode':      'badge',
        'X-ESS-Login-Identifier': badge_id,
    }
    return token, emp_id, refresh


# ── Test sections ──────────────────────────────────────────────────────────────

def test_auth(badge_id, pin, company_id, refresh_token):
    print(hdr('AUTH'))
    check('GET companies (public)',
          'GET', '/ess/api/auth/companies', no_auth=True,
          note_fn=lambda d: f'[{len(d)} companies]')
    check('POST login (badge)',
          'POST', '/ess/api/auth/login',
          {'badge_id': badge_id, 'pin': pin, 'company_id': company_id},
          no_auth=True,
          note_fn=lambda d: f'emp_id={d.get("user", {}).get("id")}')
    check('POST login (missing credentials)',
          'POST', '/ess/api/auth/login',
          {'company_id': company_id},
          no_auth=True, expect_success=False)
    check('POST refresh',
          'POST', '/ess/api/auth/refresh',
          {'refresh_token': refresh_token},
          note_fn=lambda d: str(d))
    check('POST logout',
          'POST', '/ess/api/auth/logout', {})
    check('GET by-user',
          'GET', '/ess/api/auth/by-user', {'user_id': 2})


def test_employee():
    print(hdr('EMPLOYEE'))
    check('GET profile',           'GET', '/ess/api/profile',
          note_fn=lambda d: d.get('name', ''))
    check('GET profile/contract',  'GET', '/ess/api/profile/contract')
    check('GET employees directory','GET', '/ess/api/employees',
          note_fn=lambda d: f'[{len(d)} employees]')


def test_attendance(emp_id):
    print(hdr('ATTENDANCE'))
    check('GET summary',       'GET', '/ess/api/attendance/summary')
    check('GET history',       'GET', '/ess/api/attendance/history')
    check('GET daily-sheet',   'GET', '/ess/api/attendance/daily-sheet')
    check('GET monthly-sheet', 'GET', '/ess/api/attendance/monthly-sheet')
    check('GET team',          'GET', '/ess/api/attendance/team')

    # Check-in → check-out sequence
    ci = check('POST check-in',
               'POST', '/ess/api/attendance/check-in',
               {'latitude': 30.05, 'longitude': 31.23})
    if ci and not ci.get('already_checked_in'):
        check('POST check-out',
              'POST', '/ess/api/attendance/check-out',
              {'latitude': 30.05, 'longitude': 31.23})
    else:
        # Already checked in from a previous run — just check-out
        check('POST check-out (clearing open)',
              'POST', '/ess/api/attendance/check-out',
              {'latitude': 0.0, 'longitude': 0.0})

    # Use a date ~90 days ago so it won't conflict with recent check-in/out
    import datetime
    manual_date = (datetime.date.today() - datetime.timedelta(days=90)).strftime('%Y-%m-%d')
    check('POST manual attendance',
          'POST', '/ess/api/attendance/manual',
          {'check_in':  f'{manual_date} 08:00:00',
           'check_out': f'{manual_date} 17:00:00',
           'latitude': 0.0, 'longitude': 0.0})


def test_leave():
    print(hdr('LEAVE'))
    check('GET leave/types',        'GET',  '/ess/api/leave/types',
          note_fn=lambda d: f'[{len(d)} types]')
    check('GET leave/balances',     'GET',  '/ess/api/leave/balances')
    check('GET leave/team-balances','GET',  '/ess/api/leave/team-balances')
    check('GET leave/requests',     'GET',  '/ess/api/leave/requests',
          note_fn=lambda d: f'[{len(d)} records]')

    # Get a valid leave type ID
    ok_types, types_data, _, _ = call('GET', '/ess/api/leave/types')
    leave_type_id = types_data[0]['id'] if ok_types and types_data else 1

    # Use a far-future date window to avoid conflicts on repeated runs
    import datetime
    leave_from = (datetime.date.today() + datetime.timedelta(days=365)).strftime('%Y-%m-%d')
    leave_to   = (datetime.date.today() + datetime.timedelta(days=366)).strftime('%Y-%m-%d')

    # Create → get → approve → refuse → reset → (cancel via delete)
    created = check('POST leave/requests (create)',
                    'POST', '/ess/api/leave/requests',
                    {'leave_type_id': leave_type_id,
                     'date_from': leave_from,
                     'date_to':   leave_to,
                     'description': 'API test leave'})
    leave_id = created.get('id') if created else None

    if leave_id:
        check(f'GET leave/requests/{leave_id}',
              'GET', f'/ess/api/leave/requests/{leave_id}',
              note_fn=lambda d: d.get('state', ''))
        check(f'POST leave/approve (leave {leave_id})',
              'POST', '/ess/api/leave/approve', {'leave_id': leave_id})
        check(f'POST leave/refuse (leave {leave_id})',
              'POST', '/ess/api/leave/refuse',
              {'leave_id': leave_id, 'reason': 'test refusal'})
        check(f'POST leave/reset (leave {leave_id})',
              'POST', '/ess/api/leave/reset', {'leave_id': leave_id})
    else:
        t('GET/approve/refuse/reset leave by id', False, '(no created ID)')

    check('POST leave/validate',
          'POST', '/ess/api/leave/validate',
          {'leave_id': leave_id or 1},
          expect_success=bool(leave_id))


def test_payslip():
    print(hdr('PAYSLIP'))
    data = check('GET payslip list', 'GET', '/ess/api/payslip',
                 note_fn=lambda d: f'[{len(d)} payslips]')
    payslip_id = data[0]['id'] if data else None

    if payslip_id:
        check(f'GET payslip/{payslip_id}',
              'GET', f'/ess/api/payslip/{payslip_id}',
              note_fn=lambda d: d.get('name', ''))
        check(f'POST payslip/pdf ({payslip_id})',
              'POST', '/ess/api/payslip/pdf', {'payslip_id': payslip_id},
              note_fn=lambda d: f'base64 len={len(d) if d else 0}')
    else:
        t('GET payslip by id',  True, '(no payslips in DB — skipped)')
        t('POST payslip/pdf',   True, '(no payslips in DB — skipped)')


def test_expense():
    print(hdr('EXPENSE'))
    check('GET expenses/categories', 'GET', '/ess/api/expenses/categories',
          note_fn=lambda d: f'[{len(d)} products]')
    check('GET expenses/currencies', 'GET', '/ess/api/expenses/currencies',
          note_fn=lambda d: f'[{len(d)} currencies]')
    check('GET expenses/taxes',      'GET', '/ess/api/expenses/taxes',
          note_fn=lambda d: f'[{len(d)} taxes]')
    check('GET expenses list',       'GET', '/ess/api/expenses',
          note_fn=lambda d: f'[{len(d)} expenses]')

    # Get a valid product for expense
    ok2, cats, _, _ = call('GET', '/ess/api/expenses/categories')
    prod_id = cats[0]['id'] if ok2 and cats else None

    ok3, currs, _, _ = call('GET', '/ess/api/expenses/currencies')
    # Use company currency (rate=1.0) to avoid cross-currency precompute issues
    comp_curr = next((c for c in (currs or []) if c.get('rate', 0) == 1.0), None)
    curr_id = comp_curr['id'] if comp_curr else (currs[0]['id'] if ok3 and currs else 1)

    if prod_id:
        created = check('POST expenses (create)',
                        'POST', '/ess/api/expenses',
                        {'product_id': prod_id, 'total_amount': 50.0,
                         'currency_id': curr_id, 'name': 'API test expense',
                         'date': '2026-04-01'})
        exp_id = created.get('id') if created else None
        if exp_id:
            check(f'GET expenses/{exp_id}',
                  'GET', f'/ess/api/expenses/{exp_id}',
                  note_fn=lambda d: d.get('status', ''))
            check(f'POST expenses/attach ({exp_id})',
                  'POST', '/ess/api/expenses/attach',
                  {'expense_id': exp_id, 'filename': 'receipt.txt',
                   'data': 'dGVzdA=='})
            check(f'POST expenses/submit ({exp_id})',
                  'POST', '/ess/api/expenses/submit',
                  {'expense_id': exp_id})
        else:
            t('GET expense by id',   False, '(no created ID)')
            t('POST expense/attach', False, '(no created ID)')
            t('POST expense/submit', False, '(no created ID)')
    else:
        t('POST expenses (create)',  True, '(no expensable products — skipped)')
        t('GET expense by id',       True, '(no expensable products — skipped)')
        t('POST expense/attach',     True, '(no expensable products — skipped)')
        t('POST expense/submit',     True, '(no expensable products — skipped)')


def test_loans():
    print(hdr('LOANS'))
    check('GET loans/rules', 'GET', '/ess/api/loans/rules')
    check('GET loans list',  'GET', '/ess/api/loans',
          note_fn=lambda d: f'[{len(d)} loans]')

    created = check('POST loans (create)',
                    'POST', '/ess/api/loans',
                    {'loan_amount': 1000, 'duration_months': 12,
                     'transfer_method': 'bank'})
    loan_id = created.get('id') if created else None

    if loan_id:
        check(f'GET loans/{loan_id}',
              'GET', f'/ess/api/loans/{loan_id}',
              note_fn=lambda d: d.get('state', ''))
        check(f'POST loans/approve ({loan_id})',
              'POST', '/ess/api/loans/approve', {'loan_id': loan_id})
        check(f'POST loans/refuse ({loan_id})',
              'POST', '/ess/api/loans/refuse',
              {'loan_id': loan_id, 'reason': 'test refusal'},
              expect_success=False)  # already approved → should fail
    else:
        t('GET loan by id',    True, '(loan create failed — contract/rules guard active)')
        t('POST loans/approve',True, '(loan create failed — skipped)')
        t('POST loans/refuse', True, '(loan create failed — skipped)')


def test_advance_salary():
    print(hdr('ADVANCE SALARY'))
    cap_data = check('GET advance-salary/info', 'GET', '/ess/api/advance-salary/info',
                     note_fn=lambda d: f'cap={d.get("cap")}')
    check('GET advance-salary list', 'GET', '/ess/api/advance-salary',
          note_fn=lambda d: f'[{len(d)} records]')

    # Only attempt create if we have a cap > 0
    cap = cap_data.get('cap', 0) if cap_data else 0
    if cap and cap > 0:
        amount = round(cap * 0.3, 2)  # 30% of basic wage — within the 50% cap
        created = check('POST advance-salary (create)',
                        'POST', '/ess/api/advance-salary',
                        {'advance_amount': amount})
        adv_id = created.get('id') if created else None
        if adv_id:
            check(f'GET advance-salary/{adv_id}',
                  'GET', f'/ess/api/advance-salary/{adv_id}',
                  note_fn=lambda d: d.get('state', ''))
            check(f'POST advance-salary/approve ({adv_id})',
                  'POST', '/ess/api/advance-salary/approve', {'advance_id': adv_id})
            check(f'POST advance-salary/refuse ({adv_id})',
                  'POST', '/ess/api/advance-salary/refuse',
                  {'advance_id': adv_id, 'reason': 'test'},
                  expect_success=False)  # already approved → should fail
            check(f'POST advance-salary/reset ({adv_id})',
                  'POST', '/ess/api/advance-salary/reset', {'advance_id': adv_id},
                  expect_success=False)  # approved → cannot reset
        else:
            for lbl in ('GET by id', 'approve', 'refuse', 'reset'):
                t(f'advance-salary {lbl}', False, '(no created ID)')
    else:
        for lbl in ('create', 'GET by id', 'approve', 'refuse', 'reset'):
            t(f'POST/GET advance-salary ({lbl})', True,
              '(no active contract/zero cap — skipped)')


def _hr_service_flow(name, create_path, list_path, by_id_prefix,
                     approve_path, refuse_path, reset_path, create_body):
    """Generic CRUD + approve/refuse/reset flow for HR services."""
    check(f'GET {name} list', 'GET', list_path,
          note_fn=lambda d: f'[{len(d)} records]')

    created = check(f'POST {name} (create)', 'POST', create_path, create_body)
    rec_id  = created.get('id') if created else None

    if rec_id:
        check(f'GET {by_id_prefix}/{rec_id}',
              'GET', f'{by_id_prefix}/{rec_id}',
              note_fn=lambda d: d.get('state', ''))
        check(f'POST {name}/approve ({rec_id})',
              'POST', approve_path, {'record_id': rec_id})
        check(f'POST {name}/refuse ({rec_id})',
              'POST', refuse_path,
              {'record_id': rec_id, 'reason': 'test refusal'})
        check(f'POST {name}/reset ({rec_id})',
              'POST', reset_path, {'record_id': rec_id})
        # Clean up by deleting the record (now back to draft)
        check(f'DELETE {by_id_prefix}/{rec_id}',
              'DELETE', f'{by_id_prefix}/{rec_id}')
    else:
        for op in ('GET by id', 'approve', 'refuse', 'reset', 'DELETE'):
            t(f'{name} {op}', False, '(no created ID)')


def test_hr_letters():
    print(hdr('HR LETTERS'))
    _hr_service_flow(
        name='hr-letters',
        create_path='/ess/api/hr-letters',
        list_path='/ess/api/hr-letters',
        by_id_prefix='/ess/api/hr-letters',
        approve_path='/ess/api/hr-letters/approve',
        refuse_path='/ess/api/hr-letters/refuse',
        reset_path='/ess/api/hr-letters/reset',
        create_body={'directed_to': 'To Whom It May Concern', 'salary_type': 'gross'},
    )


def test_document_requests():
    print(hdr('DOCUMENT REQUESTS'))
    check('GET document-requests/types', 'GET', '/ess/api/document-requests/types',
          note_fn=lambda d: f'[{len(d)} types]')
    _hr_service_flow(
        name='document-requests',
        create_path='/ess/api/document-requests',
        list_path='/ess/api/document-requests',
        by_id_prefix='/ess/api/document-requests',
        approve_path='/ess/api/document-requests/approve',
        refuse_path='/ess/api/document-requests/refuse',
        reset_path='/ess/api/document-requests/reset',
        create_body={'document_type': 'Passport'},
    )


def test_experience_certificates():
    print(hdr('EXPERIENCE CERTIFICATES'))
    _hr_service_flow(
        name='experience-certificates',
        create_path='/ess/api/experience-certificates',
        list_path='/ess/api/experience-certificates',
        by_id_prefix='/ess/api/experience-certificates',
        approve_path='/ess/api/experience-certificates/approve',
        refuse_path='/ess/api/experience-certificates/refuse',
        reset_path='/ess/api/experience-certificates/reset',
        create_body={'directed_to': 'Future Employer'},
    )


def test_business_services():
    print(hdr('BUSINESS SERVICES'))
    ok_t, types, _, _ = call('GET', '/ess/api/business-services/types')
    check('GET business-services/types', 'GET', '/ess/api/business-services/types',
          note_fn=lambda d: f'[{len(d)} types]')
    stype_id = types[0]['id'] if ok_t and types else None

    if stype_id:
        _hr_service_flow(
            name='business-services',
            create_path='/ess/api/business-services',
            list_path='/ess/api/business-services',
            by_id_prefix='/ess/api/business-services',
            approve_path='/ess/api/business-services/approve',
            refuse_path='/ess/api/business-services/refuse',
            reset_path='/ess/api/business-services/reset',
            create_body={'service_type_id': stype_id, 'reason': 'API test'},
        )
    else:
        for op in ('list', 'create', 'GET by id', 'approve', 'refuse', 'reset', 'DELETE'):
            t(f'business-services {op}', True, '(no service types in DB — skipped)')


def test_tasks_timesheets():
    """Tasks and timesheets are disabled (FEATURE_DISABLED = 503). That's the expected state."""
    print(hdr('TASKS & TIMESHEETS (disabled)'))
    disabled = ['FEATURE_DISABLED']
    for path, method, body, label in [
        ('/ess/api/tasks',          'GET',   None,            'GET tasks list'),
        ('/ess/api/tasks/1',        'GET',   None,            'GET tasks/1'),
        ('/ess/api/tasks/1',        'PATCH', {'vals': {}},    'PATCH tasks/1'),
        ('/ess/api/tasks/1/attachments', 'GET', None,         'GET task attachments'),
        ('/ess/api/timesheets',     'GET',   None,            'GET timesheets list'),
        ('/ess/api/timesheets/1',   'GET',   None,            'GET timesheets/1'),
        ('/ess/api/timesheets/daily',  'GET', None,           'GET timesheets/daily'),
        ('/ess/api/timesheets/weekly', 'GET', None,           'GET timesheets/weekly'),
    ]:
        check(label, method, path, body, allow_codes=disabled)


def test_team_hours():
    print(hdr('TEAM HOURS'))
    check('GET team-hours', 'GET', '/ess/api/team-hours',
          note_fn=lambda d: f'[{len(d)} members]')


def test_pending_approvals():
    print(hdr('PENDING APPROVALS'))
    check('GET pending-approvals', 'GET', '/ess/api/pending-approvals',
          note_fn=lambda d: f'[{len(d)} items]')
    # action test requires a real item — skip if none
    ok_pa, pa_data, _, _ = call('GET', '/ess/api/pending-approvals')
    if ok_pa and pa_data:
        item = pa_data[0]
        check('POST pending-approvals/<id>/action',
              'POST', f'/ess/api/pending-approvals/{item["id"]}/action',
              {'action': 'approve', 'item_type': item.get('item_type', 'leave')})
    else:
        t('POST pending-approvals action', True, '(no pending items — skipped)')


def test_notifications():
    print(hdr('NOTIFICATIONS'))
    check('GET notifications', 'GET', '/ess/api/notifications',
          note_fn=lambda d: f'[{len(d)} items]')
    check('POST notifications/read-all', 'POST', '/ess/api/notifications/read-all',
          note_fn=lambda d: f'updated={d.get("updated")}')
    # mark single only if a notification exists
    ok_n, notif_data, _, _ = call('GET', '/ess/api/notifications')
    if ok_n and notif_data:
        nid = notif_data[0]['id']
        check(f'POST notifications/{nid}/read',
              'POST', f'/ess/api/notifications/{nid}/read', {})
    else:
        t('POST notifications/<id>/read', True, '(no notifications — skipped)')


def test_announcements():
    print(hdr('ANNOUNCEMENTS'))
    check('GET announcements', 'GET', '/ess/api/announcements',
          note_fn=lambda d: f'[{len(d)} items]')


def test_personal_notes():
    print(hdr('PERSONAL NOTES'))
    check('GET personal-notes list', 'GET', '/ess/api/personal-notes',
          note_fn=lambda d: f'[{len(d)} notes]')

    created = check('POST personal-notes (create)',
                    'POST', '/ess/api/personal-notes',
                    {'title': 'API Test Note', 'body': 'Created by test suite', 'color': 2})
    note_id = created.get('id') if created else None

    if note_id:
        check(f'GET personal-notes/{note_id}',
              'GET', f'/ess/api/personal-notes/{note_id}',
              note_fn=lambda d: d.get('title', ''))
        check(f'PATCH personal-notes/{note_id}',
              'PATCH', f'/ess/api/personal-notes/{note_id}',
              {'vals': {'title': 'Updated by test suite'}})
        check(f'DELETE personal-notes/{note_id}',
              'DELETE', f'/ess/api/personal-notes/{note_id}')
    else:
        t('GET personal-notes by id',    False, '(no created ID)')
        t('PATCH personal-notes by id',  False, '(no created ID)')
        t('DELETE personal-notes by id', False, '(no created ID)')


def test_analytics():
    print(hdr('ANALYTICS'))
    check('GET analytics summary',      'GET',  '/ess/api/analytics')
    check('POST analytics/module-stats','POST', '/ess/api/analytics/module-stats',        {})
    check('POST analytics/employee-activity', 'POST',
          '/ess/api/analytics/employee-activity',   {})
    check('POST analytics/hourly-distribution', 'POST',
          '/ess/api/analytics/hourly-distribution', {})
    check('POST analytics/error-summary', 'POST',
          '/ess/api/analytics/error-summary',       {})
    check('POST analytics/daily-totals', 'POST',
          '/ess/api/analytics/daily-totals',        {})


def test_admin_stats():
    """Stats endpoint (GET /ess/api/stats) uses X-ESS-Admin-Key — test without key = auth fail."""
    print(hdr('ADMIN STATS ENDPOINT'))
    # Without admin key → should return 401
    check('GET /ess/api/stats (no key → 401)',
          'GET', '/ess/api/stats', no_auth=True, expect_success=False)


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    global BASE, VERBOSE

    parser = argparse.ArgumentParser(description='ESS HR API Test Suite')
    parser.add_argument('--base',    default='http://localhost:8055',
                        help='Odoo server base URL')
    parser.add_argument('--badge',   default='001',   help='Employee badge ID')
    parser.add_argument('--pin',     default='1234',  help='Employee PIN')
    parser.add_argument('--company', default=1, type=int, help='Company ID')
    parser.add_argument('--verbose', action='store_true',
                        help='Print full response body on failure')
    args = parser.parse_args()

    BASE    = args.base.rstrip('/')
    VERBOSE = args.verbose

    print(f'{BOLD}{"="*60}{RESET}')
    print(f'  ESS HR API Test Suite  —  {time.strftime("%Y-%m-%d %H:%M:%S")}')
    print(f'  Server  : {BASE}')
    print(f'  Badge   : {args.badge}  /  Company: {args.company}')
    print(f'{"="*60}{RESET}')

    # Step 1: login to get a fresh token
    token, emp_id, refresh_token = do_login(args.badge, args.pin, args.company)
    if not token:
        sys.exit(2)
    print(f'  {GREEN}Authenticated{RESET} — emp_id={emp_id}  token={token[:16]}...\n')

    # Run all test sections
    test_auth(args.badge, args.pin, args.company, refresh_token)
    test_employee()
    test_attendance(emp_id)
    test_leave()
    test_payslip()
    test_expense()
    test_loans()
    test_advance_salary()
    test_hr_letters()
    test_document_requests()
    test_experience_certificates()
    test_business_services()
    test_tasks_timesheets()
    test_team_hours()
    test_pending_approvals()
    test_notifications()
    test_announcements()
    test_personal_notes()
    test_analytics()
    test_admin_stats()

    sys.exit(summary())


if __name__ == '__main__':
    main()
