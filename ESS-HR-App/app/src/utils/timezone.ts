/**
 * Timezone-aware parsing/formatting for datetime strings coming from the
 * Odoo API, and device timezone detection for the outgoing X-Timezone
 * header (see ../api/client.ts).
 *
 * Odoo serializes Datetime fields as UTC. Historically this API sent bare,
 * untagged strings ('2026-07-05 14:30:00'); the migration in progress adds
 * an explicit offset ('2026-07-05T14:30:00+00:00'). parseLocalDate() is
 * tolerant of both so mobile and backend migrations don't have to land in
 * lockstep — an untagged datetime string is still treated as UTC (that was
 * already true in fact, just unlabeled).
 *
 * Pure calendar dates ('YYYY-MM-DD', Odoo Date fields) have no time-of-day
 * or timezone at all — they're parsed via the local Date(y, m, d)
 * constructor, not the ISO string form, to avoid new Date('2026-07-05')'s
 * UTC-midnight interpretation shifting the day in negative-UTC-offset
 * zones.
 */

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const HAS_OFFSET_RE = /(Z|[+-]\d{2}:?\d{2})$/;
const HAS_TIME_RE = /[ T]\d{2}:\d{2}/;

/** Device IANA timezone, e.g. 'Africa/Cairo'. Falls back to 'UTC' if Intl
 *  is unavailable or misconfigured, rather than sending an empty header. */
export function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Parse a datetime or date string received from the API into a Date.
 * Returns null for falsy/unparseable input.
 */
export function parseApiDateTime(value: string | false | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const s = String(value).trim();

  const dateOnly = s.match(DATE_ONLY_RE);
  if (dateOnly) {
    const [, y, mo, da] = dateOnly;
    return new Date(Number(y), Number(mo) - 1, Number(da));
  }

  let iso = s.replace(' ', 'T');
  if (HAS_TIME_RE.test(s) && !HAS_OFFSET_RE.test(iso)) {
    iso += 'Z';
  }
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

/** Format a datetime/date string for display in device-local time, locale-aware. */
export function formatLocalDate(
  value: string | false | null | undefined,
  locale: string,
  opts?: Intl.DateTimeFormatOptions,
): string {
  const d = parseApiDateTime(value);
  if (!d) {
    return '';
  }
  return d.toLocaleDateString(
    locale === 'ar' ? 'ar-SA' : 'en-US',
    opts ?? {weekday: 'short', month: 'short', day: 'numeric'},
  );
}

/** Format the time-of-day portion of a datetime string in device-local time. */
export function formatLocalTime(
  value: string | false | null | undefined,
  locale: string,
  opts?: Intl.DateTimeFormatOptions,
): string {
  const d = parseApiDateTime(value);
  if (!d) {
    return '';
  }
  return d.toLocaleTimeString(
    locale === 'ar' ? 'ar-SA' : 'en-US',
    opts ?? {hour: '2-digit', minute: '2-digit'},
  );
}

/** "Xm/Xh/Xd ago" relative time, matching the format previously hardcoded
 *  in NotificationsScreen.tsx (English-only strings, not locale-aware —
 *  preserved as-is; only the parsing bug is fixed here). */
export function timeAgo(value: string | false | null | undefined): string {
  const d = parseApiDateTime(value);
  if (!d) {
    return '';
  }
  const diffSec = (Date.now() - d.getTime()) / 1000;
  if (diffSec < 60) {
    return 'just now';
  }
  if (diffSec < 3600) {
    return `${Math.floor(diffSec / 60)}m ago`;
  }
  if (diffSec < 86400) {
    return `${Math.floor(diffSec / 3600)}h ago`;
  }
  return `${Math.floor(diffSec / 86400)}d ago`;
}

/**
 * Split a datetime string into device-local 'YYYY-MM-DD' and 'HH:MM'
 * strings. Replaces ad-hoc .substring(0,10)/.substring(11,16) slicing,
 * which assumed the raw string was already local wall-clock — never
 * actually true, since Odoo stores/serializes in UTC.
 */
export function splitLocalDateTime(
  value: string | false | null | undefined,
): {date: string | null; time: string | null} {
  const d = parseApiDateTime(value);
  if (!d) {
    return {date: null, time: null};
  }
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return {date: `${y}-${mo}-${da}`, time: `${h}:${mi}`};
}

/** Validates the 'HH:MM' text the user typed for manual attendance entry.
 *  No timezone conversion happens client-side — the server converts
 *  wall-clock + X-Timezone header to UTC (see manual attendance entry). */
export function isValidWallClockTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value.trim());
}
