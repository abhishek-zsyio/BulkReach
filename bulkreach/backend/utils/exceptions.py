"""Shared utility: custom exception handler."""
import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom DRF exception handler that wraps all errors in a consistent format:
    {
        "error": true,
        "message": "...",
        "details": {...}  # optional validation errors
    }
    """
    response = exception_handler(exc, context)

    if response is not None:
        error_payload = {
            "error": True,
            "message": _extract_message(response.data),
            "status_code": response.status_code,
        }
        if isinstance(response.data, dict) and len(response.data) > 1:
            error_payload["details"] = response.data
        response.data = error_payload
    else:
        logger.exception("Unhandled exception in view", exc_info=exc)
        response = Response(
            {
                "error": True,
                "message": "An unexpected server error occurred.",
                "status_code": 500,
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return response


def _extract_message(data):
    """Extract a human-readable string from DRF error data."""
    if isinstance(data, str):
        return data
    if isinstance(data, list) and data:
        return str(data[0])
    if isinstance(data, dict):
        for key in ("detail", "message", "non_field_errors"):
            if key in data:
                val = data[key]
                return str(val[0]) if isinstance(val, list) else str(val)
        first_key = next(iter(data))
        val = data[first_key]
        return f"{first_key}: {val[0] if isinstance(val, list) else val}"
    return "An error occurred."
