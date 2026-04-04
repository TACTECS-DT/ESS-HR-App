"""
Tests for miscellaneous endpoints:
  /ess/api/notifications/*
  /ess/api/announcements
  /ess/api/personal-notes/*
  /ess/api/analytics/*
  /ess/api/team-hours
  /ess/api/pending-approvals/*
  /ess/api/tasks/* and /ess/api/timesheets/* (disabled — expect 503)
  /ess/api/stats (admin-only)
"""
from odoo.tests import tagged
from .common import EssClientTestCase


# ── Notifications ─────────────────────────────────────────────────────────────

@tagged('post_install', '-at_install', 'ess_api', 'ess_notifications')
class TestNotifications(EssClientTestCase):

    def test_notifications_list(self):
        """GET /ess/api/notifications → list of notification dicts."""
        result = self._call('GET', '/ess/api/notifications')
        data = self.assertOk(result)
        self.assertIsInstance(data, list)

    def test_notifications_unread_only_filter(self):
        """GET /ess/api/notifications?unread_only=true → filtered list."""
        result = self._call('GET', '/ess/api/notifications', {'unread_only': True})
        data = self.assertOk(result)
        self.assertIsInstance(data, list)

    def test_mark_all_read(self):
        """POST /ess/api/notifications/read-all → returns updated count."""
        result = self._call('POST', '/ess/api/notifications/read-all', {})
        data = self.assertOk(result)
        self.assertIn('updated', data)
        self.assertGreaterEqual(data['updated'], 0)

    def test_mark_single_read_nonexistent_fails(self):
        """POST /ess/api/notifications/999999/read → error for missing notification."""
        result = self._call('POST', '/ess/api/notifications/999999/read', {})
        self.assertErr(result)

    def test_mark_single_read_if_available(self):
        """POST /ess/api/notifications/<id>/read → marks one as read."""
        # Create a notification to test with
        notif = self.env['ess.notification'].sudo().create({
            'employee_id': self.emp_id,
            'title':       'Test Notification',
            'body':        'Unit test notification',
            'is_read':     False,
        })
        result = self._call('POST', f'/ess/api/notifications/{notif.id}/read', {})
        self.assertOk(result)
        notif.unlink()


# ── Announcements ─────────────────────────────────────────────────────────────

@tagged('post_install', '-at_install', 'ess_api', 'ess_announcements')
class TestAnnouncements(EssClientTestCase):

    def test_announcements_list(self):
        """GET /ess/api/announcements → list of announcement dicts."""
        result = self._call('GET', '/ess/api/announcements')
        data = self.assertOk(result)
        self.assertIsInstance(data, list)


# ── Personal Notes ────────────────────────────────────────────────────────────

@tagged('post_install', '-at_install', 'ess_api', 'ess_notes')
class TestPersonalNotes(EssClientTestCase):

    def test_notes_list(self):
        """GET /ess/api/personal-notes → list of notes."""
        result = self._call('GET', '/ess/api/personal-notes')
        data = self.assertOk(result)
        self.assertIsInstance(data, list)

    def test_note_create(self):
        """POST /ess/api/personal-notes → creates note, returns it."""
        result = self._call('POST', '/ess/api/personal-notes', {
            'title': 'Test Note',
            'body':  'Created by unit test',
            'color': 1,
        })
        data = self.assertOk(result)
        self.assertHasKeys(data, ['id', 'title', 'body'])
        self.assertEqual(data['title'], 'Test Note')
        # Clean up
        self.env['ess.personal.note'].sudo().browse(data['id']).unlink()

    def test_note_full_crud(self):
        """Create → Get → Patch → Delete cycle."""
        # Create
        r_create = self._call('POST', '/ess/api/personal-notes', {
            'title': 'CRUD Test Note',
            'body':  'Original body',
            'color': 2,
        })
        note = self.assertOk(r_create)
        nid = note['id']

        # Get
        r_get = self._call('GET', f'/ess/api/personal-notes/{nid}')
        data = self.assertOk(r_get)
        self.assertEqual(data['id'], nid)

        # Patch
        r_patch = self._call('PATCH', f'/ess/api/personal-notes/{nid}', {
            'vals': {'title': 'Updated Title'},
        })
        updated = self.assertOk(r_patch)
        self.assertEqual(updated['title'], 'Updated Title')

        # Delete
        r_delete = self._call('DELETE', f'/ess/api/personal-notes/{nid}')
        self.assertOk(r_delete)

        # Confirm deleted
        r_check = self._call('GET', f'/ess/api/personal-notes/{nid}')
        self.assertErr(r_check)

    def test_note_get_nonexistent_fails(self):
        """GET /ess/api/personal-notes/999999 → error."""
        result = self._call('GET', '/ess/api/personal-notes/999999')
        self.assertErr(result)

    def test_note_access_denied_wrong_employee(self):
        """GET /ess/api/personal-notes/<id> note belonging to other employee → denied."""
        other_emp = self.env['hr.employee'].sudo().create({
            'name': 'Other Employee for Note Test',
            'company_id': self.company_id,
        })
        note = self.env['ess.personal.note'].sudo().create({
            'employee_id': other_emp.id,
            'title':       'Other Employee Note',
            'body':        'Not yours',
        })
        result = self._call('GET', f'/ess/api/personal-notes/{note.id}')
        self.assertErr(result)  # should be access denied
        note.unlink()
        other_emp.unlink()


# ── Analytics ─────────────────────────────────────────────────────────────────

@tagged('post_install', '-at_install', 'ess_api', 'ess_analytics')
class TestAnalytics(EssClientTestCase):

    def test_analytics_summary(self):
        """GET /ess/api/analytics → summary analytics dict."""
        result = self._call('GET', '/ess/api/analytics')
        data = self.assertOk(result)
        self.assertIsInstance(data, dict)

    def test_analytics_module_stats(self):
        """POST /ess/api/analytics/module-stats → module usage stats."""
        result = self._call('POST', '/ess/api/analytics/module-stats', {})
        self.assertOk(result)

    def test_analytics_employee_activity(self):
        """POST /ess/api/analytics/employee-activity → activity stats."""
        result = self._call('POST', '/ess/api/analytics/employee-activity', {})
        self.assertOk(result)

    def test_analytics_hourly_distribution(self):
        """POST /ess/api/analytics/hourly-distribution → hourly breakdown."""
        result = self._call('POST', '/ess/api/analytics/hourly-distribution', {})
        self.assertOk(result)

    def test_analytics_error_summary(self):
        """POST /ess/api/analytics/error-summary → error log summary."""
        result = self._call('POST', '/ess/api/analytics/error-summary', {})
        self.assertOk(result)

    def test_analytics_daily_totals(self):
        """POST /ess/api/analytics/daily-totals → daily call totals."""
        result = self._call('POST', '/ess/api/analytics/daily-totals', {})
        self.assertOk(result)


# ── Team Hours ────────────────────────────────────────────────────────────────

@tagged('post_install', '-at_install', 'ess_api', 'ess_team')
class TestTeamHours(EssClientTestCase):

    def test_team_hours_returns_list(self):
        """GET /ess/api/team-hours → list (may be empty if no subordinates)."""
        result = self._call('GET', '/ess/api/team-hours')
        data = self.assertOk(result)
        self.assertIsInstance(data, list)


# ── Pending Approvals ─────────────────────────────────────────────────────────

@tagged('post_install', '-at_install', 'ess_api', 'ess_approvals')
class TestPendingApprovals(EssClientTestCase):

    def test_pending_approvals_list(self):
        """GET /ess/api/pending-approvals → list of pending items."""
        result = self._call('GET', '/ess/api/pending-approvals')
        data = self.assertOk(result)
        self.assertIsInstance(data, list)


# ── Tasks & Timesheets (feature disabled) ─────────────────────────────────────

@tagged('post_install', '-at_install', 'ess_api', 'ess_tasks')
class TestTasksDisabled(EssClientTestCase):
    """Tasks and timesheets are disabled. All routes should return FEATURE_DISABLED."""

    def _assert_feature_disabled(self, result):
        self.assertFalse(result.get('success'))
        code = result.get('error', {}).get('code')
        self.assertEqual(code, 'FEATURE_DISABLED',
                         f'Expected FEATURE_DISABLED, got {code}')

    def test_tasks_list_disabled(self):
        result = self._call('GET', '/ess/api/tasks')
        self._assert_feature_disabled(result)

    def test_task_by_id_disabled(self):
        result = self._call('GET', '/ess/api/tasks/1')
        self._assert_feature_disabled(result)

    def test_timesheets_list_disabled(self):
        result = self._call('GET', '/ess/api/timesheets')
        self._assert_feature_disabled(result)

    def test_timesheet_daily_disabled(self):
        result = self._call('GET', '/ess/api/timesheets/daily')
        self._assert_feature_disabled(result)

    def test_timesheet_weekly_disabled(self):
        result = self._call('GET', '/ess/api/timesheets/weekly')
        self._assert_feature_disabled(result)

    def test_task_attachments_disabled(self):
        result = self._call('GET', '/ess/api/tasks/1/attachments')
        self._assert_feature_disabled(result)


# ── Admin Stats Endpoint ──────────────────────────────────────────────────────

@tagged('post_install', '-at_install', 'ess_api', 'ess_stats')
class TestStatsEndpoint(EssClientTestCase):

    def test_stats_without_admin_key_fails(self):
        """GET /ess/api/stats without X-ESS-Admin-Key → 401."""
        result = self._call('GET', '/ess/api/stats', auth=False)
        self.assertErr(result, code='UNAUTHORIZED')

    def test_stats_with_admin_key_returns_data(self):
        """GET /ess/api/stats with correct admin key → employee + user stats."""
        # Get the configured admin key (empty means open access)
        admin_key = self.env['ir.config_parameter'].sudo().get_param(
            'ess.admin.api.key', ''
        )
        result = self._call('GET', '/ess/api/stats', auth=False,
                            extra_headers={'X-ESS-Admin-Key': admin_key})
        data = self.assertOk(result)
        self.assertHasKeys(data, ['employee_count', 'active_user_count',
                                   'employees', 'active_users'])
        self.assertGreaterEqual(data['employee_count'], 1)  # at least our test employee
