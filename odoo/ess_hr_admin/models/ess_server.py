import logging
import requests
from odoo import models, fields, api, _
from odoo.exceptions import UserError

_logger = logging.getLogger(__name__)


class EssServer(models.Model):
    """
    ESS Client Server registry.

    One record per client Odoo installation that has ess_hr_client installed.
    The admin server periodically pulls stats from each client to enforce limits.
    """
    _name = 'ess.server'
    _description = 'ESS Client Server'
    _rec_name = 'name'

    name = fields.Char(string='Server Name', required=True)
    url = fields.Char(
        string='Server URL',
        required=True,
        help='Base URL of the client Odoo server (e.g. https://company.odoo.com). '
             'Trailing slashes are ignored during validation.',
    )
    active = fields.Boolean(string='Active', default=True)

    # ── License link ──────────────────────────────────────────────────────────
    license_id = fields.Many2one(
        'ess.license',
        string='License',
        ondelete='set null',
    )

    # ── Per-server settings ───────────────────────────────────────────────────
    auto_logout_duration = fields.Integer(
        string='Auto Logout Duration (hours)',
        default=72,
        help='Number of hours of inactivity before the mobile app auto-logs out. '
             'Default is 72 hours (3 days). Sent to the mobile app on each Step 1 validation.',
    )

    # ── Live stats (fetched from client) ──────────────────────────────────────
    employee_count = fields.Integer(
        string='Employee Count', readonly=True, default=0,
        help='Number of active employees on the client server (last sync).',
    )
    active_user_count = fields.Integer(
        string='Active Users (30d)', readonly=True, default=0,
        help='Employees who used the mobile app in the last 30 days (last sync).',
    )
    last_sync_date = fields.Datetime(string='Last Sync', readonly=True)
    last_sync_status = fields.Selection(
        selection=[
            ('success', 'Success'),
            ('failed', 'Failed'),
            ('unreachable', 'Unreachable'),
        ],
        string='Last Sync Status',
        readonly=True,
    )
    last_sync_error = fields.Text(string='Last Sync Error', readonly=True)

    # ── Server status ─────────────────────────────────────────────────────────
    server_status = fields.Selection(
        selection=[
            ('active', 'Active'),
            ('unreachable', 'Unreachable'),
            ('deactivated', 'Deactivated'),
        ],
        string='Status',
        default='active',
        readonly=True,
    )

    _url_unique = models.Constraint(
        'UNIQUE(url)',
        'A server URL must be unique.',
    )

    # ── Manual sync action ────────────────────────────────────────────────────

    def action_sync_stats(self):
        """Manual trigger: pull stats from this server right now."""
        self.ensure_one()
        self._sync_stats()
        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': _('Sync Complete'),
                'message': _('Stats synced. Status: %s') % dict(
                    self._fields['last_sync_status'].selection
                ).get(self.last_sync_status, ''),
                'sticky': False,
                'type': 'success' if self.last_sync_status == 'success' else 'warning',
            },
        }

    # ── Internal sync ─────────────────────────────────────────────────────────

    def _sync_stats(self):
        """
        Fetch stats from the client server's /ess/api/stats endpoint.
        Updates employee_count, active_user_count, last_sync_date, last_sync_status.
        Deactivates license if limits are exceeded or server is unreachable.
        """
        self.ensure_one()
        admin_key = self.env['ir.config_parameter'].sudo().get_param('ess.admin.api.key', '')
        stats_url = self._normalize_url(self.url) + '/ess/api/stats'
        headers = {}
        if admin_key:
            headers['X-ESS-Admin-Key'] = admin_key

        try:
            resp = requests.get(stats_url, headers=headers, timeout=15)
            resp.raise_for_status()
            data = resp.json()
            if not data.get('success'):
                raise ValueError('Stats endpoint returned failure: %s' % data)
            stats = data.get('data', {})
            employee_count = int(stats.get('employee_count', 0))
            active_user_count = int(stats.get('active_user_count', 0))
            # employee_list and active_user_list are also available in stats
            # but are not stored — they're used only for real-time display if needed
            self.sudo().write({
                'employee_count': employee_count,
                'active_user_count': active_user_count,
                'last_sync_date': fields.Datetime.now(),
                'last_sync_status': 'success',
                'last_sync_error': False,
                'server_status': 'active',
            })
            self._check_employee_limit(employee_count)

        except requests.exceptions.ConnectionError:
            self.sudo().write({
                'last_sync_date': fields.Datetime.now(),
                'last_sync_status': 'unreachable',
                'last_sync_error': 'Connection refused or DNS resolution failed.',
                'server_status': 'unreachable',
            })
            self._deactivate_license('Server unreachable: %s' % self.url)

        except requests.exceptions.Timeout:
            self.sudo().write({
                'last_sync_date': fields.Datetime.now(),
                'last_sync_status': 'unreachable',
                'last_sync_error': 'Request timed out after 15 seconds.',
                'server_status': 'unreachable',
            })
            self._deactivate_license('Server timed out: %s' % self.url)

        except Exception as exc:
            self.sudo().write({
                'last_sync_date': fields.Datetime.now(),
                'last_sync_status': 'failed',
                'last_sync_error': str(exc),
            })
            _logger.error('ESS Admin: stats sync failed for %s: %s', self.url, exc)

    def _check_employee_limit(self, employee_count):
        """Deactivate license if employee count exceeds the license's max + overage."""
        license_rec = self.license_id
        if not license_rec:
            return
        limit = license_rec.max_employees + license_rec.employee_overage_allowed
        if employee_count > limit:
            reason = (
                'Employee limit exceeded: %d employees found, limit is %d '
                '(max %d + overage allowed %d).'
            ) % (employee_count, limit, license_rec.max_employees, license_rec.employee_overage_allowed)
            self._deactivate_license(reason)

    def _deactivate_license(self, reason):
        """Deactivate the license linked to this server and record the reason."""
        license_rec = self.license_id
        if not license_rec or not license_rec.active:
            return
        license_rec.sudo().write({
            'active': False,
            'deactivation_reason': reason,
            'deactivation_date': fields.Datetime.now(),
        })
        self.sudo().write({'server_status': 'deactivated'})
        _logger.warning('ESS Admin: license %s deactivated — %s', license_rec.name, reason)

    @api.model
    def _normalize_url(self, url):
        return (url or '').strip().rstrip('/')

    # ── Scheduled action entry point ──────────────────────────────────────────

    @api.model
    def cron_sync_all_stats(self):
        """Called by the daily scheduled action — syncs all active servers."""
        servers = self.sudo().search([('active', '=', True)])
        for server in servers:
            try:
                server._sync_stats()
            except Exception as exc:
                _logger.error('ESS Admin cron: error syncing %s: %s', server.url, exc)
