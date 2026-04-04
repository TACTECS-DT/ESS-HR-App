from odoo import models, fields, api, SUPERUSER_ID


class EssApiLog(models.Model):
    _name = 'ess.api.log'
    _description = 'ESS API Request Log'
    _order = 'timestamp desc'
    _rec_name = 'endpoint'

    timestamp = fields.Datetime(
        string='Timestamp', default=fields.Datetime.now,
        index=True, readonly=True,
    )
    endpoint = fields.Char(string='Endpoint', index=True, readonly=True)
    module = fields.Char(string='Module', index=True, readonly=True)
    action = fields.Char(string='Action', readonly=True)
    employee_id = fields.Many2one(
        'hr.employee', string='Employee',
        index=True, readonly=True, ondelete='set null',
    )
    company_id = fields.Many2one('res.company', string='Company', readonly=True)
    odoo_uid = fields.Integer(string='Odoo User ID', readonly=True)
    ip_address = fields.Char(string='IP Address', readonly=True)
    status = fields.Selection(
        selection=[('success', 'Success'), ('error', 'Error')],
        string='Status', index=True, readonly=True,
    )
    error_message = fields.Text(string='Error Message', readonly=True)
    duration_ms = fields.Integer(string='Duration (ms)', readonly=True)

    # ── Public write method called from controller ────────────────────────────

    @api.model
    def write_log(self, endpoint, employee_id, status, error_message, duration_ms, ip_address):
        """Create one log entry for an API request. Called by the controller."""
        module, action = self._extract_module_action(endpoint)
        company_id = self._get_employee_company(employee_id)
        # Explicitly use SUPERUSER so create_uid/write_uid are never NULL.
        # This is required in test and unauthenticated HTTP contexts where
        # env.uid may be 0 (no session), which would violate the NOT NULL constraint.
        orig_uid = self.env.uid
        self.env(user=SUPERUSER_ID, su=True)['ess.api.log'].create({
            'endpoint': endpoint,
            'module': module,
            'action': action,
            'employee_id': employee_id or False,
            'company_id': company_id,
            'odoo_uid': orig_uid,
            'ip_address': ip_address or '',
            'status': status,
            'error_message': error_message or False,
            'duration_ms': duration_ms,
        })

    # ── Analytics methods ─────────────────────────────────────────────────────

    @api.model
    def get_module_stats(self, date_from=None, date_to=None):
        """Return request totals grouped by module with success/error counts."""
        domain = self._build_date_domain(date_from, date_to)
        logs = self.with_user(SUPERUSER_ID).search(domain)
        stats = {}
        for log in logs:
            mod = log.module or 'unknown'
            if mod not in stats:
                stats[mod] = {'module': mod, 'total': 0, 'success': 0, 'error': 0}
            stats[mod]['total'] += 1
            stats[mod][log.status] += 1
        return sorted(stats.values(), key=lambda x: x['total'], reverse=True)

    @api.model
    def get_employee_activity(self, date_from=None, date_to=None, limit=20):
        """Return top employees ordered by request count."""
        domain = self._build_date_domain(date_from, date_to)
        domain += [('employee_id', '!=', False)]
        logs = self.with_user(SUPERUSER_ID).search(domain)
        emp_stats = {}
        for log in logs:
            eid = log.employee_id.id
            if eid not in emp_stats:
                emp_stats[eid] = {
                    'employee_id': eid,
                    'employee_name': log.employee_id.name,
                    'total': 0, 'success': 0, 'error': 0,
                }
            emp_stats[eid]['total'] += 1
            emp_stats[eid][log.status] += 1
        sorted_list = sorted(emp_stats.values(), key=lambda x: x['total'], reverse=True)
        return sorted_list[:limit]

    @api.model
    def get_hourly_distribution(self, date_from=None, date_to=None):
        """Return request count per hour of the day (0–23)."""
        domain = self._build_date_domain(date_from, date_to)
        logs = self.with_user(SUPERUSER_ID).search(domain)
        hours = {h: 0 for h in range(24)}
        for log in logs:
            if log.timestamp:
                hours[log.timestamp.hour] += 1
        return [{'hour': h, 'count': hours[h]} for h in range(24)]

    @api.model
    def get_error_summary(self, date_from=None, date_to=None):
        """Return error counts grouped by endpoint, most frequent first."""
        domain = self._build_date_domain(date_from, date_to)
        domain += [('status', '=', 'error')]
        logs = self.with_user(SUPERUSER_ID).search(domain)
        endpoint_stats = {}
        for log in logs:
            ep = log.endpoint or 'unknown'
            if ep not in endpoint_stats:
                endpoint_stats[ep] = {'endpoint': ep, 'module': log.module, 'count': 0}
            endpoint_stats[ep]['count'] += 1
        return sorted(endpoint_stats.values(), key=lambda x: x['count'], reverse=True)

    @api.model
    def get_daily_totals(self, date_from=None, date_to=None):
        """Return total requests per calendar day with success/error split."""
        domain = self._build_date_domain(date_from, date_to)
        logs = self.with_user(SUPERUSER_ID).search(domain, order='timestamp asc')
        day_stats = {}
        for log in logs:
            if log.timestamp:
                day = log.timestamp.strftime('%Y-%m-%d')
                if day not in day_stats:
                    day_stats[day] = {'date': day, 'total': 0, 'success': 0, 'error': 0}
                day_stats[day]['total'] += 1
                day_stats[day][log.status] += 1
        return list(day_stats.values())

    # ── Private helpers ───────────────────────────────────────────────────────

    def _extract_module_action(self, endpoint):
        """Parse /ess/api/<module>/<action> into (module, action) strings."""
        if not endpoint:
            return ('unknown', 'unknown')
        parts = [p for p in endpoint.strip('/').split('/') if p]
        # expected: ['ess', 'api', '<module>', '<action>']
        module = parts[2] if len(parts) > 2 else 'unknown'
        action = parts[3] if len(parts) > 3 else 'unknown'
        return (module, action)

    def _get_employee_company(self, employee_id):
        """Look up the company_id for the given employee_id, or return False."""
        if not employee_id:
            return False
        emp = self.env['hr.employee'].with_user(SUPERUSER_ID).browse(employee_id)
        return emp.company_id.id if emp.exists() and emp.company_id else False

    def _build_date_domain(self, date_from, date_to):
        """Build a search domain list for an optional date range."""
        domain = []
        if date_from:
            domain.append(('timestamp', '>=', date_from + ' 00:00:00'))
        if date_to:
            domain.append(('timestamp', '<=', date_to + ' 23:59:59'))
        return domain
