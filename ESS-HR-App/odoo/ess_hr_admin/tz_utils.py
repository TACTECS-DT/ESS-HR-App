"""
Shared timezone utilities for the ESS HR REST API modules.

DUPLICATE FILE -- this file is intentionally duplicated byte-for-byte between
odoo/ess_hr_client/tz_utils.py and odoo/ess_hr_admin/tz_utils.py. There is no
shared package between the two modules. If you edit this file, make the
identical edit in the other copy.

Lives at the module root (sibling to models/ and controllers/), not inside
controllers/, because both models and controllers import it -- a controllers/
location would make model files import from the controllers package,
triggering controllers/__init__.py (and every controller module it loads) as
a side effect of importing a plain utility function.

The mobile app sends its IANA timezone (e.g. 'Africa/Cairo') as the
X-Timezone header on every request. This module:
  - validates that header (validate_timezone_header)
  - converts a naive wall-clock date+time in that timezone to a naive UTC
    datetime for storage (wall_clock_to_utc) -- used only where the mobile
    app sends a hand-entered date/time with no captured instant (e.g.
    manual attendance entry)
  - converts a stored (naive, UTC-implied) Odoo datetime/date value into an
    explicit UTC-tagged string for API responses (utc_to_iso_string,
    utc_to_date_string)

Odoo stores Datetime fields as naive UTC. Nothing here changes that -- this
module only adds explicit timezone labeling/conversion at the API boundary.
"""
from datetime import datetime, timezone
import pytz

from odoo.exceptions import ValidationError

# pytz, not stdlib zoneinfo: zoneinfo needs the OS's IANA tz database, which
# Windows (and some minimal Linux images) don't ship -- it silently depends
# on the optional `tzdata` PyPI package being installed. Odoo itself hard-
# depends on pytz everywhere internally, which bundles its own IANA data
# with no OS dependency, so it's guaranteed present on any Odoo install.


class InvalidTimezoneError(ValidationError):
    """Missing or invalid X-Timezone header. Subclasses ValidationError so it
    is caught by the existing `except (UserError, ValidationError)` -> 400
    handling already present at every controller chokepoint."""


def validate_timezone_header(tz_name):
    """
    Validate an incoming X-Timezone header value.

    Returns the validated IANA zone name (stripped) unchanged on success.
    Raises InvalidTimezoneError if tz_name is missing, blank, or not a
    resolvable IANA zone name.
    """
    if not tz_name or not tz_name.strip():
        raise InvalidTimezoneError(
            'Missing X-Timezone header. The app must send its IANA timezone '
            'with every request.'
        )
    tz_name = tz_name.strip()
    try:
        pytz.timezone(tz_name)
    except pytz.exceptions.UnknownTimeZoneError:
        raise InvalidTimezoneError(
            'Invalid X-Timezone header: %r is not a recognized IANA timezone name.' % tz_name
        )
    return tz_name


def wall_clock_to_utc(date_str, time_str, tz_name):
    """
    Convert a naive wall-clock date + time in the given IANA zone to a naive
    UTC datetime suitable for direct assignment to an Odoo Datetime field.

    date_str: 'YYYY-MM-DD'
    time_str: 'HH:MM' or 'HH:MM:SS'
    tz_name:  IANA zone, e.g. 'Africa/Cairo' -- assumed already validated by
              validate_timezone_header() before this is called.

    Returns a naive datetime (tzinfo stripped) equal to the UTC instant
    corresponding to that wall-clock moment in that zone. Resolves the
    offset for the given date (not "today"), so DST-observing zones are
    handled correctly.
    """
    time_str = time_str.strip()
    fmt = '%Y-%m-%d %H:%M:%S' if time_str.count(':') == 2 else '%Y-%m-%d %H:%M'
    naive = datetime.strptime('%s %s' % (date_str, time_str), fmt)
    localized = pytz.timezone(tz_name).localize(naive)
    return localized.astimezone(pytz.utc).replace(tzinfo=None)


def utc_to_iso_string(dt):
    """
    Convert a stored Odoo Datetime field value (naive, UTC-implied) into an
    ISO-8601 string carrying an explicit UTC offset, e.g.
    '2026-07-05T14:30:00+00:00'. Returns False for falsy input, matching the
    existing "false, not null" convention used throughout the API.
    """
    if not dt:
        return False
    return dt.replace(tzinfo=timezone.utc).isoformat()


def utc_to_date_string(d):
    """
    Format an Odoo Date field value as 'YYYY-MM-DD'. No timezone conversion
    is needed -- Date fields have no time-of-day component; this exists only
    so date and datetime serialization go through one consistent import
    instead of ad-hoc strftime() calls.
    """
    if not d:
        return False
    return d.strftime('%Y-%m-%d')
