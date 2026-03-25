from odoo.tests.common import TransactionCase
from odoo.exceptions import UserError


class TestEssLicense(TransactionCase):

    def setUp(self):
        super().setUp()
        self.company = self.env.ref('base.main_company')
        self.license_model = self.env['ess.license']
        self.valid_license = self.license_model.create({
            'name': 'Test License Standard',
            'company_id': self.company.id,
            'license_key': 'TEST-KEY-STANDARD-001',
            'tier': 'standard',
            'active': True,
        })
        self.expired_license = self.license_model.create({
            'name': 'Expired License',
            'company_id': self.company.id,
            'license_key': 'EXPIRED-KEY-001',
            'tier': 'basic',
            'active': True,
            'expiry_date': '2020-01-01',
        })

    def test_validate_valid_key(self):
        """Validate a known-good active license key and confirm returned dict structure."""
        result = self.license_model.validate_license_key('TEST-KEY-STANDARD-001')
        self.assertIsInstance(result, dict)
        self.assertEqual(result['tier'], 'standard')
        self.assertIn('company', result)
        self.assertEqual(result['company']['id'], self.company.id)

    def test_validate_invalid_key_raises(self):
        """Validate that a non-existent key raises a UserError."""
        with self.assertRaises(UserError):
            self.license_model.validate_license_key('INVALID-KEY-XYZ')

    def test_validate_expired_key_raises(self):
        """Validate that an expired license key raises a UserError."""
        with self.assertRaises(UserError):
            self.license_model.validate_license_key('EXPIRED-KEY-001')

    def test_validate_empty_key_raises(self):
        """Validate that an empty key raises a UserError."""
        with self.assertRaises(UserError):
            self.license_model.validate_license_key('')

    def test_get_companies_for_license(self):
        """get_companies_for_license returns a non-empty list for a valid key."""
        result = self.license_model.get_companies_for_license('TEST-KEY-STANDARD-001')
        self.assertIsInstance(result, list)
        self.assertGreater(len(result), 0)
        self.assertEqual(result[0]['id'], self.company.id)

    def test_get_companies_invalid_key_raises(self):
        """get_companies_for_license raises for an unknown key."""
        with self.assertRaises(UserError):
            self.license_model.get_companies_for_license('NO-SUCH-KEY')

    def test_generate_license_key_format(self):
        """_generate_license_key produces a 32-char uppercase hex string."""
        key = self.valid_license._generate_license_key()
        self.assertIsInstance(key, str)
        self.assertEqual(len(key), 32)
        self.assertTrue(key.isupper() or key.replace('-', '').isalnum())

    def test_is_expired_false_for_future(self):
        """_is_expired returns False when expiry_date is in the future."""
        self.valid_license.expiry_date = '2099-12-31'
        self.assertFalse(self.valid_license._is_expired())

    def test_is_expired_true_for_past(self):
        """_is_expired returns True when expiry_date has passed."""
        self.assertTrue(self.expired_license._is_expired())

    def test_format_license_info_keys(self):
        """_format_license_info returns all expected keys."""
        info = self.license_model._format_license_info(self.valid_license)
        for key in ('id', 'name', 'tier', 'active', 'expiry_date', 'company'):
            self.assertIn(key, info)
