"""
Common base class for all ESS HR Admin API tests.

Creates a full license + server + module fixture once per class.
Provides:
  - self._call(method, path, body, log) — HTTP helper against /ess/admin/api/*
  - assertOk / assertErr — response assertion helpers
"""
import json
from odoo.tests import HttpCase


def _log_api_call(method, path, status_code, data):
    """Emit one tagged line so run_tests.py can display it under the test result."""
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

    print(f'[API] {method.upper():<6} {path:<50} {status_code}  {outcome}  {brief}')


class EssAdminTestCase(HttpCase):
    """Base class for ess_hr_admin endpoint tests."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        env = cls.env

        # ── Modules ───────────────────────────────────────────────────────────
        m_attendance = env['ess.module'].sudo().search(
            [('code', '=', 'attendance')], limit=1
        )
        if not m_attendance:
            m_attendance = env['ess.module'].sudo().create({
                'name': 'Attendance',
                'code': 'attendance',
            })
        m_leave = env['ess.module'].sudo().search(
            [('code', '=', 'leave')], limit=1
        )
        if not m_leave:
            m_leave = env['ess.module'].sudo().create({
                'name': 'Leave',
                'code': 'leave',
            })

        # ── License ───────────────────────────────────────────────────────────
        cls.license = env['ess.license'].sudo().create({
            'name':                  'ESS Test License',
            'license_key':           'TEST-LIC-KEY-001',
            'active':                True,
            'tier':                  'standard',
            'max_employees':         50,
            'employee_overage_allowed': 5,
            'module_ids':            [(6, 0, [m_attendance.id, m_leave.id])],
        })

        # ── Server ────────────────────────────────────────────────────────────
        cls.server_url = 'http://test-client-server.local'
        cls.server = env['ess.server'].sudo().create({
            'name':                 'ESS Test Client Server',
            'url':                  cls.server_url,
            'license_id':           cls.license.id,
            'auto_logout_duration': 72,
            'employee_count':       10,
            'active_user_count':    3,
        })

    @classmethod
    def tearDownClass(cls):
        # Clean up test fixtures
        try:
            cls.server.sudo().unlink()
        except Exception:
            pass
        try:
            cls.license.sudo().unlink()
        except Exception:
            pass
        super().tearDownClass()

    def _call(self, method, path, body=None, log=True):
        """Make an HTTP call to an admin endpoint."""
        url = f'{self.base_url()}{path}'
        headers = {'Content-Type': 'application/json'}
        data_bytes = json.dumps(body or {}).encode()

        session = self.opener
        if method.upper() == 'GET':
            resp = session.get(url, headers=headers, timeout=15)
        else:
            resp = session.post(url, data=data_bytes, headers=headers, timeout=15)

        try:
            data = resp.json()
        except Exception:
            data = {'success': False, 'error': {'code': 'INVALID_JSON',
                                                  'message': resp.text[:200]}}

        if log:
            _log_api_call(method, path, resp.status_code, data)

        return data

    def assertOk(self, result, msg=None):
        self.assertTrue(
            result.get('success'),
            msg or f'Expected success=true. Response: {json.dumps(result)[:400]}',
        )
        return result.get('data')

    def assertErr(self, result, code=None, msg=None):
        self.assertFalse(
            result.get('success'),
            msg or f'Expected success=false. Response: {json.dumps(result)[:400]}',
        )
        if code:
            actual = result.get('error', {}).get('code')
            self.assertEqual(actual, code, f'Expected error {code}, got {actual}')
        return result.get('error', {})

    def assertHasKeys(self, data, keys):
        for k in keys:
            self.assertIn(k, data, f'Missing key "{k}" in: {list(data.keys())}')
