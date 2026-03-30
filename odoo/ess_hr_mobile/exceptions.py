"""
Custom exceptions for the ESS HR Mobile module.
Defined here so both models and controllers can import without circular dependencies.
"""


class EssLicenseError(Exception):
    """
    Raised when license validation fails.

    Codes:
      SERVER_NOT_FOUND  — server URL not registered in ess.server
      LICENSE_INACTIVE  — server found but no active license linked to it
      LICENSE_EXPIRED   — license exists and was active but has passed its expiry date
    """
    def __init__(self, message, code):
        super().__init__(message)
        self.code = code
