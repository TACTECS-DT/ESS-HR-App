from odoo import api, SUPERUSER_ID


def post_init_hook(env):
    """
    Create a default hr.loan.config for the main company if one does not already exist.
    Using a post_init_hook avoids UniqueViolation on reinstall when the record still
    exists in the database but its ir.model.data entry has been removed.
    """
    main_company = env.ref('base.main_company')
    config = env['hr.loan.config'].sudo()
    if not config.search([('company_id', '=', main_company.id)], limit=1):
        config.create({
            'company_id': main_company.id,
            'min_hiring_months': 6,
            'max_duration_months': 24,
            'min_gap_months': 3,
            'max_amount_percentage': 3.0,
        })
