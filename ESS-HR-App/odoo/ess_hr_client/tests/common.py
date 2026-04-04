"""
Common base class for all ESS HR Client API endpoint tests.

Every test file imports EssClientTestCase from here.
Provides:
  - Fixture data created once per class:  company, employee, ESS credential, contract
  - Fresh auth token per test method via setUp()
  - HTTP helpers: GET(), POST(), PATCH(), DELETE()
  - Assertion helpers: assertOk(), assertErr()
"""
import json
from odoo.tests import HttpCase

# ── Fixture credentials (unique enough to avoid constraint collisions) ─────────
_BADGE = 'ESS_TEST_BADGE_01'
_PIN   = '7777'


def _log_api_call(method, path, status_code, data):
    """
    Emit one tagged line per API call so run_tests.py can display it
    grouped under the test result.

    Format:
        [API] POST   /ess/api/auth/login                     200  OK   {tokens, user}
        [API] GET    /ess/api/attendance/summary              200  OK   {status, hours_worked_today}
        [API] POST   /ess/api/leave/approve                  500  ERR  VALIDATION_ERROR
    """
    ok = data.get('success', False)
    if ok:
        d = data.get('data', {})
        if isinstance(d, list):
            brief = f'list[{len(d)}]'
        elif isinstance(d, dict):
            keys = list(d.keys())[:4]
            brief = '{' + ', '.join(str(k) for k in keys)
            if len(d) > 4:
                brief += ', ...'
            brief += '}'
        elif d is None:
            brief = 'null'
        else:
            brief = str(d)[:60]
        outcome = 'OK'
    else:
        err = data.get('error', {})
        if isinstance(err, dict):
            brief = err.get('code') or err.get('message', '')[:60]
        else:
            brief = str(err)[:60]
        outcome = 'ERR'

    print(f'[API] {method.upper():<6} {path:<50} {status_code}  {outcome}  {brief}', flush=True)


class EssClientTestCase(HttpCase):
    """Base class shared by all ess_hr_client API tests."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        env = cls.env

        cls.company    = env.ref('base.main_company')
        cls.company_id = cls.company.id

        # ── Reuse or create test employee ─────────────────────────────────────
        cred = env['ess.employee.credential'].sudo().search(
            [('badge_id', '=', _BADGE), ('company_id', '=', cls.company_id)],
            limit=1,
        )
        if cred:
            cls.employee = cred.employee_id
        else:
            admin_user = env.ref('base.user_admin')
            # Admin may already have an employee record — reuse it to avoid
            # the hr_employee_user_uniq constraint violation.
            existing_emp = env['hr.employee'].sudo().search(
                [('user_id', '=', admin_user.id), ('company_id', '=', cls.company_id)],
                limit=1,
            )
            if existing_emp:
                cls.employee = existing_emp
            else:
                cls.employee = env['hr.employee'].sudo().create({
                    'name': 'ESS API Test Employee',
                    'company_id': cls.company_id,
                    'user_id': admin_user.id,
                })
            env['ess.employee.credential'].sudo().create({
                'employee_id': cls.employee.id,
                'badge_id':    _BADGE,
                'new_pin':     _PIN,
            })

        cls.emp_id   = cls.employee.id
        cls.badge_id = _BADGE
        cls.pin      = _PIN

        # ── Optional: create a contract so advance-salary & loan tests work ────
        try:
            existing_contract = env['hr.contract'].sudo().search(
                [('employee_id', '=', cls.employee.id), ('state', '=', 'open')], limit=1
            )
            if not existing_contract:
                env['hr.contract'].sudo().create({
                    'name':        'ESS Test Contract',
                    'employee_id': cls.employee.id,
                    'company_id':  cls.company_id,
                    'wage':        5000.0,
                    'state':       'open',
                    'date_start':  '2025-01-01',
                })
        except (KeyError, Exception):
            pass  # hr.contract not installed — advance-salary tests will skip

        # ── Auth state (populated per test in setUp) ───────────────────────────
        cls._auth_hdrs     = {}
        cls._refresh_token = ''

    def setUp(self):
        super().setUp()
        # log=False: suppress the setup login from the per-test API call display
        result = self._call('POST', '/ess/api/auth/login', {
            'badge_id':   self.badge_id,
            'pin':        self.pin,
            'company_id': self.company_id,
        }, auth=False, log=False)
        self.assertTrue(result.get('success'), f'Test login failed: {result}')
        tokens = result['data']['tokens']
        self._auth_hdrs = {
            'Authorization':          f"Bearer {tokens['access_token']}",
            'X-ESS-Company-ID':       str(self.company_id),
            'X-ESS-Employee-ID':      str(self.emp_id),
            'X-ESS-Login-Mode':       'badge',
            'X-ESS-Login-Identifier': self.badge_id,
        }
        self._refresh_token = tokens.get('refresh_token', '')

    # ── HTTP helpers ──────────────────────────────────────────────────────────

    def _call(self, method, path, body=None, auth=True, extra_headers=None, log=True):
        """
        Make an HTTP call to a client endpoint and return the parsed JSON dict.

        method         — 'GET', 'POST', 'PATCH', 'DELETE'
        auth           — include auth headers (default True)
        extra_headers  — additional headers to merge in
        log            — emit [API] line for run_tests.py display (default True)
        """
        url = f'{self.base_url()}{path}'
        headers = {'Content-Type': 'application/json'}
        if auth:
            headers.update(self._auth_hdrs)
        if extra_headers:
            headers.update(extra_headers)

        meth = method.upper()
        session = self.opener  # requests.Session bound to the test server

        if meth == 'GET':
            resp = session.get(url, headers=headers, timeout=15)
        elif meth == 'POST':
            resp = session.post(url, data=json.dumps(body or {}).encode(),
                                headers=headers, timeout=15)
        elif meth == 'PATCH':
            resp = session.patch(url, data=json.dumps(body or {}).encode(),
                                 headers=headers, timeout=15)
        elif meth == 'DELETE':
            resp = session.delete(url, headers=headers, timeout=15)
        else:
            raise ValueError(f'Unknown HTTP method: {method}')

        try:
            data = resp.json()
        except Exception:
            data = {'success': False, 'error': {'code': 'INVALID_JSON',
                                                  'message': resp.text[:200]}}

        if log:
            _log_api_call(method, path, resp.status_code, data)

        return data

    # ── Assertion helpers ─────────────────────────────────────────────────────

    def assertOk(self, result, msg=None):
        """Assert success=true and return data."""
        self.assertTrue(
            result.get('success'),
            msg or f'Expected success=true. Response: {json.dumps(result)[:400]}',
        )
        return result.get('data')

    def assertErr(self, result, code=None, msg=None):
        """Assert success=false, optionally check error code."""
        self.assertFalse(
            result.get('success'),
            msg or f'Expected success=false. Response: {json.dumps(result)[:400]}',
        )
        if code:
            actual = result.get('error', {}).get('code')
            self.assertEqual(actual, code, f'Expected error {code}, got {actual}')
        return result.get('error', {})

    def assertHasKeys(self, data, keys):
        """Assert all keys are present in data dict."""
        for k in keys:
            self.assertIn(k, data, f'Missing key "{k}" in response: {list(data.keys())}')
