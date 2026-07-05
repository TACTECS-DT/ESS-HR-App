"""
Tests for the X-Timezone header contract: tz_utils.py's pure conversion
functions, and end-to-end enforcement at the /ess/api/* chokepoint.
"""
import unittest
from datetime import datetime

from odoo.tests import tagged

from ..tz_utils import (
    InvalidTimezoneError,
    validate_timezone_header,
    wall_clock_to_utc,
    utc_to_iso_string,
    utc_to_date_string,
)
from .common import EssClientTestCase


# ── Pure-function tests (no DB / HTTP needed) ──────────────────────────────────

class TestValidateTimezoneHeader(unittest.TestCase):

    def test_valid_iana_zone_passes(self):
        self.assertEqual(validate_timezone_header('Africa/Cairo'), 'Africa/Cairo')

    def test_strips_whitespace(self):
        self.assertEqual(validate_timezone_header('  Africa/Cairo  '), 'Africa/Cairo')

    def test_missing_raises(self):
        with self.assertRaises(InvalidTimezoneError):
            validate_timezone_header(None)

    def test_empty_string_raises(self):
        with self.assertRaises(InvalidTimezoneError):
            validate_timezone_header('')

    def test_whitespace_only_raises(self):
        with self.assertRaises(InvalidTimezoneError):
            validate_timezone_header('   ')

    def test_non_iana_offset_string_raises(self):
        """'GMT+2' / POSIX-style strings are a plausible real-world mistake — not a valid IANA name."""
        with self.assertRaises(InvalidTimezoneError):
            validate_timezone_header('GMT+2')

    def test_garbage_raises(self):
        with self.assertRaises(InvalidTimezoneError):
            validate_timezone_header('Not/AZone')


class TestWallClockToUtc(unittest.TestCase):

    def test_cairo_summer_dst(self):
        """Egypt resumed DST in 2023 — July is +03:00 (EEST), not the old fixed +02:00."""
        result = wall_clock_to_utc('2026-07-05', '09:00', 'Africa/Cairo')
        self.assertEqual(result, datetime(2026, 7, 5, 6, 0, 0))

    def test_quarter_hour_offset_kathmandu(self):
        """Asia/Kathmandu is a fixed +05:45 offset — catches hardcoded whole-hour assumptions."""
        result = wall_clock_to_utc('2026-07-05', '09:00', 'Asia/Kathmandu')
        self.assertEqual(result, datetime(2026, 7, 5, 3, 15, 0))

    def test_half_hour_dst_lord_howe(self):
        """Australia/Lord_Howe: +10:30 standard / +11:00 daylight — half-hour DST offset."""
        # January is daylight time in Lord Howe (Southern Hemisphere summer) => +11:00
        result_dst = wall_clock_to_utc('2026-01-15', '12:00', 'Australia/Lord_Howe')
        self.assertEqual(result_dst, datetime(2026, 1, 15, 1, 0, 0))
        # July is standard time there => +10:30
        result_std = wall_clock_to_utc('2026-07-15', '12:00', 'Australia/Lord_Howe')
        self.assertEqual(result_std, datetime(2026, 7, 15, 1, 30, 0))

    def test_negative_half_hour_dst_st_johns(self):
        """America/St_Johns: -03:30 standard / -02:30 daylight — negative + half-hour + DST at once."""
        # July => Newfoundland Daylight Time, -02:30
        result_dst = wall_clock_to_utc('2026-07-15', '09:00', 'America/St_Johns')
        self.assertEqual(result_dst, datetime(2026, 7, 15, 11, 30, 0))
        # January => Newfoundland Standard Time, -03:30
        result_std = wall_clock_to_utc('2026-01-15', '09:00', 'America/St_Johns')
        self.assertEqual(result_std, datetime(2026, 1, 15, 12, 30, 0))

    def test_dst_transition_resolved_per_date_not_cached(self):
        """Same zone, two dates either side of a DST transition — must resolve per-instant."""
        winter = wall_clock_to_utc('2026-01-15', '12:00', 'America/New_York')  # EST, -05:00
        summer = wall_clock_to_utc('2026-07-15', '12:00', 'America/New_York')  # EDT, -04:00
        self.assertEqual(winter, datetime(2026, 1, 15, 17, 0, 0))
        self.assertEqual(summer, datetime(2026, 7, 15, 16, 0, 0))

    def test_extreme_positive_offset(self):
        """Pacific/Kiritimati is +14:00 — catches assumptions about offset range."""
        result = wall_clock_to_utc('2026-07-05', '10:00', 'Pacific/Kiritimati')
        self.assertEqual(result, datetime(2026, 7, 4, 20, 0, 0))

    def test_accepts_seconds_in_time_str(self):
        result = wall_clock_to_utc('2026-07-05', '09:00:30', 'Africa/Cairo')
        self.assertEqual(result, datetime(2026, 7, 5, 7, 0, 30))

    def test_result_is_naive(self):
        result = wall_clock_to_utc('2026-07-05', '09:00', 'Africa/Cairo')
        self.assertIsNone(result.tzinfo)


class TestUtcToIsoString(unittest.TestCase):

    def test_known_datetime_round_trip(self):
        dt = datetime(2026, 7, 5, 14, 30, 0)
        self.assertEqual(utc_to_iso_string(dt), '2026-07-05T14:30:00+00:00')

    def test_falsy_input_returns_false(self):
        self.assertIs(utc_to_iso_string(False), False)
        self.assertIs(utc_to_iso_string(None), False)


class TestUtcToDateString(unittest.TestCase):

    def test_known_date_formats(self):
        dt = datetime(2026, 7, 5, 14, 30, 0)
        self.assertEqual(utc_to_date_string(dt), '2026-07-05')

    def test_falsy_input_returns_false(self):
        self.assertIs(utc_to_date_string(False), False)
        self.assertIs(utc_to_date_string(None), False)


# ── Integration tests: header enforcement at the chokepoint ───────────────────

@tagged('post_install', '-at_install', 'ess_api', 'ess_timezone')
class TestTimezoneHeaderEnforcement(EssClientTestCase):

    def test_missing_header_rejected(self):
        """Non-public endpoint without X-Timezone header → 400 VALIDATION_ERROR."""
        # auth=False so _call() doesn't re-merge the full _auth_hdrs (which
        # includes X-Timezone) back in after we strip it.
        headers = {k: v for k, v in self._auth_hdrs.items() if k != 'X-Timezone'}
        result = self._call('GET', '/ess/api/attendance/summary', auth=False, extra_headers=headers)
        self.assertErr(result, code='VALIDATION_ERROR')

    def test_invalid_header_rejected(self):
        """Non-public endpoint with a garbage X-Timezone value → 400 VALIDATION_ERROR."""
        result = self._call(
            'GET', '/ess/api/attendance/summary',
            extra_headers={'X-Timezone': 'Not/AZone'},
        )
        self.assertErr(result, code='VALIDATION_ERROR')

    def test_public_endpoint_exempt(self):
        """Public endpoints (login) don't require X-Timezone at all."""
        result = self._call('POST', '/ess/api/auth/login', {
            'badge_id':   self.badge_id,
            'pin':        self.pin,
            'company_id': self.company_id,
        }, auth=False)
        self.assertOk(result)

    def test_manual_attendance_entry_converts_wall_clock_per_header_zone(self):
        """Manual entry with a non-Cairo X-Timezone header → stored UTC value matches that zone."""
        self.env['hr.attendance'].sudo().search(
            [('employee_id', '=', self.emp_id), ('check_out', '=', False)]
        ).unlink()
        result = self._call(
            'POST', '/ess/api/attendance/manual',
            {'date': '2026-07-15', 'check_in': '09:00'},
            extra_headers={'X-Timezone': 'America/St_Johns'},
        )
        data = self.assertOk(result)
        # America/St_Johns is -02:30 in July (daylight) => 09:00 local = 11:30 UTC
        self.assertEqual(data['check_in'], '2026-07-15T11:30:00+00:00')
        self.env['hr.attendance'].sudo().browse(data['id']).unlink()
