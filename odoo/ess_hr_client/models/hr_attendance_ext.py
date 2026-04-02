from datetime import datetime, date
from odoo import models, fields, api, _, SUPERUSER_ID
from odoo.exceptions import UserError


class HrAttendanceExt(models.Model):
    _name = 'hr.attendance'
    _inherit = ['hr.attendance', 'ess.mixin']

    gps_latitude = fields.Float(string='Check-in Latitude', digits=(10, 7))
    gps_longitude = fields.Float(string='Check-in Longitude', digits=(10, 7))
    checkout_latitude = fields.Float(string='Check-out Latitude', digits=(10, 7))
    checkout_longitude = fields.Float(string='Check-out Longitude', digits=(10, 7))

    def _update_overtime(self, attendance_domain=None):
        """Override to guard against enterprise-only overtime computation failures."""
        try:
            return super()._update_overtime(attendance_domain)
        except Exception:
            pass

    @api.model
    def ess_check_in(self, employee_id, timestamp, latitude, longitude, task_id=False):
        """Create a new attendance check-in record. Returns attendance dict."""
        employee = self._get_employee(employee_id)
        open_att = self._find_open_attendance(employee_id)
        if open_att:
            result = self._format_attendance_record(open_att)
            result['already_checked_in'] = True
            return result
        check_in_dt = self._parse_timestamp(timestamp)
        vals = {
            'employee_id': employee_id,
            'check_in': check_in_dt,
            'gps_latitude': latitude or 0.0,
            'gps_longitude': longitude or 0.0,
        }
        # task_id is not a field on hr.attendance in Odoo 19 — removed
        attendance = self.with_user(SUPERUSER_ID).with_context(tracking_disable=True).create(vals)
        return self._format_attendance_record(attendance)

    @api.model
    def ess_check_out(self, employee_id, timestamp, latitude, longitude):
        """Register a check-out on the open attendance record. Returns attendance dict."""
        employee = self._get_employee(employee_id)
        open_att = self._find_open_attendance(employee_id)
        if not open_att:
            raise UserError(_('No open attendance found for this employee.'))
        check_out_dt = self._parse_timestamp(timestamp)
        open_att.with_user(SUPERUSER_ID).with_context(tracking_disable=True).write({
            'check_out': check_out_dt,
            'checkout_latitude': latitude or 0.0,
            'checkout_longitude': longitude or 0.0,
        })
        return self._format_attendance_record(open_att)

    @api.model
    def get_attendance_status(self, employee_id):
        """Return the current check-in status and today's hours for an employee."""
        employee = self._get_employee(employee_id)
        open_att = self._find_open_attendance(employee_id)
        checked_in = bool(open_att)
        check_in_time = False
        if open_att:
            check_in_time = open_att.check_in.strftime('%Y-%m-%d %H:%M:%S') if open_att.check_in else False
        hours_today = self._calculate_hours_today(employee_id)
        return {
            'status': 'checked_in' if checked_in else 'checked_out',
            'check_in_time': check_in_time,
            'hours_worked_today': round(hours_today, 2),
            'hours_today': round(hours_today, 2),
            'hours_worked_this_month': 0,
            'absences_this_month': 0,
        }

    @api.model
    def get_attendance_history(self, employee_id, date_from, date_to, page=1, page_size=20):
        """Return paginated attendance records between two dates."""
        employee = self._get_employee(employee_id)
        today = fields.Date.today()
        if not date_from:
            date_from = str(today.replace(day=1))
        if not date_to:
            date_to = str(today)
        domain = [
            ('employee_id', '=', employee_id),
            ('check_in', '>=', date_from + ' 00:00:00'),
            ('check_in', '<=', date_to + ' 23:59:59'),
        ]
        total = self.with_user(SUPERUSER_ID).search_count(domain)
        offset = (page - 1) * page_size
        records = self.with_user(SUPERUSER_ID).search(domain, order='check_in desc', limit=page_size, offset=offset)
        return {
            'total': total,
            'page': page,
            'page_size': page_size,
            'records': [self._format_attendance_record(r) for r in records],
        }

    @api.model
    def get_daily_sheet(self, employee_id, date):
        """Return all attendance entries for an employee on the given date (YYYY-MM-DD)."""
        employee = self._get_employee(employee_id)
        if not date:
            date = str(fields.Date.today())
        domain = [
            ('employee_id', '=', employee_id),
            ('check_in', '>=', date + ' 00:00:00'),
            ('check_in', '<=', date + ' 23:59:59'),
        ]
        records = self.with_user(SUPERUSER_ID).search(domain, order='check_in asc')
        return [self._format_attendance_record(r) for r in records]

    @api.model
    def get_monthly_sheet(self, employee_id, year, month):
        """Return a list of day dicts with attendance status for the entire month."""
        import calendar
        employee = self._get_employee(employee_id)
        today = fields.Date.today()
        if not year:
            year = today.year
        if not month:
            month = today.month
        year = int(year)
        month = int(month)
        _, days_in_month = calendar.monthrange(year, month)
        result = []
        for day in range(1, days_in_month + 1):
            day_date = date(year, month, day)
            status = self._get_day_status(employee_id, day_date)
            domain = [
                ('employee_id', '=', employee_id),
                ('check_in', '>=', day_date.strftime('%Y-%m-%d') + ' 00:00:00'),
                ('check_in', '<=', day_date.strftime('%Y-%m-%d') + ' 23:59:59'),
            ]
            day_records = self.with_user(SUPERUSER_ID).search(domain)
            total_hours = sum(r.worked_hours for r in day_records if r.worked_hours)
            result.append({
                'date': day_date.strftime('%Y-%m-%d'),
                'status': status,
                'total_hours': round(total_hours, 2),
                'entries': len(day_records),
            })
        return result

    @api.model
    def get_team_attendance(self, manager_employee_id, attendance_date=None):
        """Return attendance status for all direct reports of the manager on a given date."""
        manager = self._get_employee(manager_employee_id)
        team = self.env['hr.employee'].with_user(SUPERUSER_ID).search([('parent_id', '=', manager_employee_id)])
        target_date = attendance_date or fields.Date.today()
        if isinstance(target_date, str):
            from datetime import datetime as _dt
            try:
                target_date = _dt.strptime(target_date, '%Y-%m-%d').date()
            except (ValueError, TypeError):
                target_date = fields.Date.today()
        result = []
        for emp in team:
            status = self._get_day_status(emp.id, target_date)
            domain = [
                ('employee_id', '=', emp.id),
                ('check_in', '>=', target_date.strftime('%Y-%m-%d') + ' 00:00:00'),
                ('check_in', '<=', target_date.strftime('%Y-%m-%d') + ' 23:59:59'),
            ]
            day_records = self.with_user(SUPERUSER_ID).search(domain)
            total_hours = sum(r.worked_hours for r in day_records if r.worked_hours)
            open_att = self.with_user(SUPERUSER_ID).search(
                [('employee_id', '=', emp.id), ('check_out', '=', False)], limit=1
            )
            result.append({
                'employee_id': emp.id,
                'employee_name': emp.name,
                'status': status,
                'checked_in': bool(open_att),
                'check_in_time': open_att.check_in.strftime('%Y-%m-%d %H:%M:%S') if open_att and open_att.check_in else False,
                'total_hours': round(total_hours, 2),
                'entries': len(day_records),
            })
        return result

    @api.model
    def create_manual_attendance(self, employee_id, check_in_str, check_out_str=None,
                                  latitude=0.0, longitude=0.0):
        """Create a manual attendance record (HR admin action). Returns attendance dict."""
        employee = self._get_employee(employee_id)
        check_in_dt = self._parse_timestamp(check_in_str)
        vals = {
            'employee_id': employee_id,
            'check_in': check_in_dt,
            'gps_latitude': latitude or 0.0,
            'gps_longitude': longitude or 0.0,
        }
        if check_out_str:
            vals['check_out'] = self._parse_timestamp(check_out_str)
        attendance = self.with_user(SUPERUSER_ID).with_context(tracking_disable=True).create(vals)
        return self._format_attendance_record(attendance)

    def _find_open_attendance(self, employee_id):
        """Find the open (no check_out) attendance record for an employee."""
        return self.with_user(SUPERUSER_ID).search(
            [('employee_id', '=', employee_id), ('check_out', '=', False)],
            limit=1,
        )

    def _calculate_hours_today(self, employee_id):
        """Calculate total worked hours today for the employee."""
        today = fields.Date.today()
        domain = [
            ('employee_id', '=', employee_id),
            ('check_in', '>=', str(today) + ' 00:00:00'),
            ('check_in', '<=', str(today) + ' 23:59:59'),
        ]
        records = self.with_user(SUPERUSER_ID).search(domain)
        total = 0.0
        for r in records:
            if r.worked_hours:
                total += r.worked_hours
            elif r.check_in and not r.check_out:
                now = fields.Datetime.now()
                total += (now - r.check_in).total_seconds() / 3600.0
        return total

    def _get_day_status(self, employee_id, date_obj):
        """Determine the attendance status string for a given date."""
        if date_obj.weekday() >= 5:
            return 'Weekend'
        leave = self.env['hr.leave'].with_user(SUPERUSER_ID).search([
            ('employee_id', '=', employee_id),
            ('date_from', '<=', fields.Datetime.to_string(
                datetime.combine(date_obj, datetime.min.time()))),
            ('date_to', '>=', fields.Datetime.to_string(
                datetime.combine(date_obj, datetime.min.time()))),
            ('state', '=', 'validate'),
        ], limit=1)
        if leave:
            return 'On Leave'
        domain = [
            ('employee_id', '=', employee_id),
            ('check_in', '>=', date_obj.strftime('%Y-%m-%d') + ' 00:00:00'),
            ('check_in', '<=', date_obj.strftime('%Y-%m-%d') + ' 23:59:59'),
        ]
        records = self.with_user(SUPERUSER_ID).search(domain, limit=1)
        if records:
            return 'Present'
        if date_obj <= fields.Date.today():
            return 'Absent'
        return 'Future'

    def _format_attendance_record(self, att):
        """Format an hr.attendance record into a plain dict."""
        try:
            worked_hours = round(att.worked_hours or 0.0, 2)
        except Exception:
            worked_hours = 0.0
        try:
            checkout_lat = att.checkout_latitude
            checkout_lon = att.checkout_longitude
        except Exception:
            checkout_lat = 0.0
            checkout_lon = 0.0
        return {
            'id': att.id,
            'employee_id': att.employee_id.id,
            'employee_name': att.employee_id.name,
            'check_in': att.check_in.strftime('%Y-%m-%d %H:%M:%S') if att.check_in else False,
            'check_out': att.check_out.strftime('%Y-%m-%d %H:%M:%S') if att.check_out else False,
            'worked_hours': worked_hours,
            'gps_latitude': att.gps_latitude or 0.0,
            'gps_longitude': att.gps_longitude or 0.0,
            'checkout_latitude': checkout_lat,
            'checkout_longitude': checkout_lon,
        }

    def _parse_timestamp(self, timestamp_str):
        """Parse a timestamp string into a datetime object. Defaults to now if not provided."""
        if timestamp_str:
            for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%dT%H:%M:%SZ'):
                try:
                    return datetime.strptime(timestamp_str, fmt)
                except (ValueError, TypeError):
                    continue
        return fields.Datetime.now()
