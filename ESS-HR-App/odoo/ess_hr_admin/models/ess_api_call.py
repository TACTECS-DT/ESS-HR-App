from odoo import models, fields


class EssApiCall(models.Model):
    """
    Log of every inbound call to the ESS Admin API.

    Records are created by the call_admin() utility on each request,
    regardless of success or failure. Use the Pivot and Graph views for reports
    (e.g. login count per server per day, error rate, response times).
    """
    _name = 'ess.api.call'
    _description = 'ESS Admin API Call Log'
    _order = 'call_date desc'
    _rec_name = 'endpoint'

    # ── When & what ───────────────────────────────────────────────────────────
    call_date = fields.Datetime(
        string='Called At',
        readonly=True,
        default=fields.Datetime.now,
        index=True,
    )
    endpoint = fields.Char(string='Endpoint', readonly=True, index=True)

    # ── Which server / license ────────────────────────────────────────────────
    server_url = fields.Char(string='Server URL', readonly=True)
    server_id = fields.Many2one(
        'ess.server',
        string='Server',
        readonly=True,
        ondelete='set null',
        index=True,
    )
    license_id = fields.Many2one(
        'ess.license',
        string='License',
        related='server_id.license_id',
        store=True,
        readonly=True,
        index=True,
    )

    # ── Outcome ───────────────────────────────────────────────────────────────
    success = fields.Boolean(string='Success', readonly=True, index=True)
    error_code = fields.Char(string='Error Code', readonly=True)

    # ── Network ───────────────────────────────────────────────────────────────
    ip_address = fields.Char(string='IP Address', readonly=True)
    duration_ms = fields.Integer(string='Duration (ms)', readonly=True)
