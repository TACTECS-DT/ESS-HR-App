"""
Custom exceptions for the ESS HR Client module.
Defined here so both models and controllers can import without circular dependencies.
"""


class EssApiError(Exception):
    """
    Raised for ESS API business errors.

    Codes:
      VALIDATION_ERROR  — bad input or business rule violation
      UNAUTHENTICATED   — missing or invalid auth context
      SERVER_ERROR      — unexpected server-side failure
    """
    def __init__(self, message, code='VALIDATION_ERROR'):
        super().__init__(message)
        self.code = code
