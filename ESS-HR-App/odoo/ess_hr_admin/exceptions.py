"""
Custom exceptions for the ESS HR Admin module.
"""


class EssLicenseError(Exception):
    """
    Raised when license validation fails.

    Codes:
      SERVER_NOT_FOUND      — server URL not registered
      LICENSE_INACTIVE      — no active license for this server
      LICENSE_EXPIRED       — license has passed its expiry date
      EMPLOYEE_LIMIT        — employee count exceeds allowed maximum
      SERVER_UNREACHABLE    — admin cannot reach the client server
    """
    def __init__(self, message, code='LICENSE_INACTIVE'):
        super().__init__(message)
        self.code = code
