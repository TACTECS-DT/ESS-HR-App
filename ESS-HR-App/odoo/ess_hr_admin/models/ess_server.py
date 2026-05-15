import logging
import secrets
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
    _inherit = ['mail.thread', 'mail.activity.mixin']

    name = fields.Char(string='Server Name', required=True, tracking=True)
    url = fields.Char(
        string='Server URL',
        required=True,
        tracking=True,
        help='Base URL of the client Odoo server (e.g. https://company.odoo.com). '
             'Trailing slashes are ignored during validation.',
    )
    # ── License link ──────────────────────────────────────────────────────────
    license_id = fields.Many2one(
        'ess.license',
        string='License',
        ondelete='set null',
        tracking=True,
    )

    # ── Admin connection key ──────────────────────────────────────────────────
    connection_key = fields.Char(
        string='Admin Connection Key',
        copy=False,
        help='Secret key sent with every stats sync request (X-ESS-Admin-Key header). '
             'Must match the value set in ESS Client → Configuration → Settings.',
    )

    # ── Per-server settings ───────────────────────────────────────────────────
    auto_logout_duration = fields.Integer(
        string='Auto Logout Duration (hours)',
        default=72,
        tracking=True,
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
        tracking=True,
    )

    # ── Status history ────────────────────────────────────────────────────────
    history_ids = fields.One2many(
        'ess.server.history', 'server_id', string='Status History', readonly=True,
    )

    _url_unique = models.Constraint(
        'UNIQUE(url)',
        'A server URL must be unique.',
    )

    # ── Status wizard ─────────────────────────────────────────────────────────

    def action_open_status_wizard(self):
        """Open the Change Status wizard pre-filled with this server."""
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': _('Change Server Status'),
            'res_model': 'ess.server.status.wizard',
            'view_mode': 'form',
            'target': 'new',
            'context': {
                'default_server_id': self.id,
                'default_new_status': self.server_status,
            },
        }

    # ── Key generation ────────────────────────────────────────────────────────

    def action_generate_key(self):
        """Generate a new cryptographically secure connection key (256-bit)."""
        self.ensure_one()
        self.sudo().write({'connection_key': secrets.token_urlsafe(32)})
        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': _('Key Generated'),
                'message': _('New connection key generated. Copy it and paste it into Odoo Settings → ESS Client → Admin Connection Key → Save.'),
                'sticky': True,
                'type': 'warning',
                'next': {
                    'type': 'ir.actions.act_window',
                    'res_model': self._name,
                    'res_id': self.id,
                    'view_mode': 'form',
                    'views': [[False, 'form']],
                    'target': 'current',
                },
            },
        }

    # ── Manual sync action ────────────────────────────────────────────────────

    def action_sync_stats(self):
        """Manual trigger: pull stats from this server and show a specific result notification."""
        self.ensure_one()
        result = self._sync_stats()
        reload = {
            'type': 'ir.actions.act_window',
            'res_model': self._name,
            'res_id': self.id,
            'view_mode': 'form',
            'views': [[False, 'form']],
            'target': 'current',
        }

        if result.get('ok'):
            if result.get('limit_exceeded'):
                return {
                    'type': 'ir.actions.client',
                    'tag': 'display_notification',
                    'params': {
                        'title': _('Employee Limit Exceeded'),
                        'message': _(
                            'Sync succeeded but the employee limit is exceeded '
                            '(%d employees on this server). The license has been deactivated.'
                        ) % result['employee_count'],
                        'sticky': True,
                        'type': 'danger',
                        'next': reload,
                    },
                }
            return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'title': _('Sync Successful'),
                    'message': _('%d employees · %d active mobile users (last 30 days).') % (
                        result['employee_count'], result['active_user_count']
                    ),
                    'sticky': False,
                    'type': 'success',
                    'next': reload,
                },
            }

        _TITLES = {
            'AUTH_FAILED':       _('Wrong Connection Key'),
            'ENDPOINT_NOT_FOUND': _('Client Module Not Found'),
            'SERVER_ERROR':      _('Client Server Error'),
            'HTTP_ERROR':        _('Unexpected HTTP Response'),
            'RESPONSE_ERROR':    _('Invalid Response from Client'),
            'UNREACHABLE':       _('Server Unreachable'),
            'TIMEOUT':           _('Connection Timed Out'),
            'UNEXPECTED':        _('Sync Failed'),
        }
        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': _TITLES.get(result.get('error_type'), _('Sync Failed')),
                'message': result.get('message', _('An unknown error occurred.')),
                'sticky': True,
                'type': 'danger',
                'next': reload,
            },
        }

    # ── Internal sync ─────────────────────────────────────────────────────────

    def _sync_stats(self):
        """
        Fetch stats from the client server's /ess/api/stats endpoint.
        Returns a result dict: {'ok': True, ...} or {'ok': False, 'error_type': ..., 'message': ...}.
        Always writes last_sync_* fields regardless of outcome.
        """
        self.ensure_one()
        stats_url = self._normalize_url(self.url) + '/ess/api/stats'
        headers = {}
        if self.connection_key:
            headers['X-ESS-Admin-Key'] = self.connection_key

        def _write_status(sync_status, error_msg, server_status=None):
            old_status = self.server_status
            vals = {
                'last_sync_date': fields.Datetime.now(),
                'last_sync_status': sync_status,
                'last_sync_error': error_msg or False,
            }
            if server_status:
                vals['server_status'] = server_status
            self.sudo().write(vals)
            if server_status and server_status != old_status:
                self.sudo()._log_history(old_status, server_status, error_msg, source='sync')

        try:
            resp = requests.get(stats_url, headers=headers, timeout=15)

            if resp.status_code == 401:
                msg = (
                    'Authentication failed (401). '
                    'The connection key on this server record does not match the key '
                    'set in ESS Client → Configuration → Settings. '
                    'Regenerate the key and update both sides.'
                )
                _write_status('failed', msg)
                return {'ok': False, 'error_type': 'AUTH_FAILED', 'message': msg}

            if resp.status_code == 404:
                msg = (
                    'Stats endpoint not found (404). '
                    'Confirm that ess_hr_client is installed on the client server '
                    'and that the server URL is correct (%s).' % self.url
                )
                _write_status('failed', msg)
                return {'ok': False, 'error_type': 'ENDPOINT_NOT_FOUND', 'message': msg}

            if resp.status_code >= 500:
                msg = (
                    'The client server returned an internal error (%d). '
                    'Check the Odoo logs on the client server for details.' % resp.status_code
                )
                _write_status('failed', msg)
                return {'ok': False, 'error_type': 'SERVER_ERROR', 'message': msg}

            if resp.status_code != 200:
                msg = 'Unexpected HTTP response: %d %s.' % (resp.status_code, resp.reason)
                _write_status('failed', msg)
                return {'ok': False, 'error_type': 'HTTP_ERROR', 'message': msg}

            data = resp.json()
            if not data.get('success'):
                err = data.get('error', {})
                msg = 'Client returned a failure: %s' % (err.get('message') or str(data))
                _write_status('failed', msg)
                return {'ok': False, 'error_type': 'RESPONSE_ERROR', 'message': msg}

            stats = data.get('data', {})
            employee_count = int(stats.get('employee_count', 0))
            active_user_count = int(stats.get('active_user_count', 0))
            # Write counts first; server_status is set below depending on the limit check.
            self.sudo().write({
                'employee_count': employee_count,
                'active_user_count': active_user_count,
                'last_sync_date': fields.Datetime.now(),
                'last_sync_status': 'success',
                'last_sync_error': False,
            })
            limit_exceeded = self._check_employee_limit(employee_count)
            if not limit_exceeded:
                old_status = self.server_status
                self.sudo().write({'server_status': 'active'})
                if old_status != 'active':
                    self.sudo()._log_history(old_status, 'active', 'Sync successful — server is reachable.', source='sync')
            return {
                'ok': True,
                'employee_count': employee_count,
                'active_user_count': active_user_count,
                'limit_exceeded': limit_exceeded,
            }

        except requests.exceptions.ConnectionError:
            msg = (
                'Cannot reach the server at %s. '
                'Check that the URL is correct and the Odoo server is running.' % self.url
            )
            _write_status('unreachable', msg, server_status='unreachable')
            self._deactivate_license('Server unreachable: %s' % self.url)
            return {'ok': False, 'error_type': 'UNREACHABLE', 'message': msg}

        except requests.exceptions.Timeout:
            msg = (
                'Connection timed out after 15 seconds. '
                'The server at %s is not responding.' % self.url
            )
            _write_status('unreachable', msg, server_status='unreachable')
            self._deactivate_license('Server timed out: %s' % self.url)
            return {'ok': False, 'error_type': 'TIMEOUT', 'message': msg}

        except Exception as exc:
            msg = 'Unexpected error during sync: %s' % str(exc)
            _write_status('failed', msg)
            _logger.error('ESS Admin: stats sync failed for %s: %s', self.url, exc)
            return {'ok': False, 'error_type': 'UNEXPECTED', 'message': msg}

    def _check_employee_limit(self, employee_count):
        """Deactivate this server (and the license if still active) when the limit is exceeded."""
        license_rec = self.license_id
        if not license_rec:
            return False
        limit = license_rec.max_employees + license_rec.employee_overage_allowed
        if employee_count > limit:
            reason = (
                'Employee limit exceeded: %d employees found, limit is %d '
                '(max %d + overage allowed %d).'
            ) % (employee_count, limit, license_rec.max_employees, license_rec.employee_overage_allowed)
            old_status = self.server_status
            if old_status != 'deactivated':
                self.sudo()._log_history(old_status, 'deactivated', reason, source='sync')
            self.sudo().write({'server_status': 'deactivated'})
            self._deactivate_license(reason)
            return True
        return False

    def _deactivate_license(self, reason):
        """Deactivate the license and ALL servers linked to it."""
        license_rec = self.license_id
        if not license_rec or not license_rec.active:
            return
        for server in license_rec.server_ids:
            if server.server_status != 'deactivated':
                server.sudo()._log_history(server.server_status, 'deactivated', reason, source='sync')
        license_rec.sudo()._log_history('active', 'inactive', reason, source='sync')
        license_rec.sudo().write({
            'active': False,
            'deactivation_reason': reason,
            'deactivation_date': fields.Datetime.now(),
        })
        license_rec.server_ids.sudo().write({'server_status': 'deactivated'})
        _logger.warning('ESS Admin: license %s deactivated — %s', license_rec.name, reason)

    def _log_history(self, old_status, new_status, reason, source='sync'):
        """Record a server status change. No-op if status did not change."""
        self.ensure_one()
        if old_status == new_status:
            return
        self.env['ess.server.history'].sudo().create({
            'server_id': self.id,
            'date': fields.Datetime.now(),
            'old_status': old_status,
            'new_status': new_status,
            'reason': (reason or '').strip() or False,
            'source': source,
        })

    @api.model
    def _normalize_url(self, url):
        return (url or '').strip().rstrip('/')

    # ── Scheduled action entry point ──────────────────────────────────────────

    @api.model
    def cron_sync_all_stats(self):
        """Called by the daily scheduled action — syncs all non-deactivated servers."""
        servers = self.sudo().search([('server_status', '!=', 'deactivated')])
        for server in servers:
            try:
                server._sync_stats()
            except Exception as exc:
                _logger.error('ESS Admin cron: error syncing %s: %s', server.url, exc)
