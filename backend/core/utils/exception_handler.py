from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError as DRFValidationError
import logging

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler that returns a consistent JSON structure.
    """
    # Call REST framework's default exception handler first,
    # to get the standard error response.
    response = exception_handler(exc, context)

    if response is None:
        # Handle Django ValidationErrors that DRF didn't catch
        if isinstance(exc, DjangoValidationError):
            data = {
                "error": "Validation Error",
                "message": str(exc),
                "details": exc.message_dict if hasattr(exc, "message_dict") else None,
            }
            return Response(data, status=status.HTTP_400_BAD_REQUEST)

        # Handle other unexpected exceptions
        logger.error(f"Unexpected error: {exc}", exc_info=True)
        data = {
            "error": "Internal Server Error",
            "message": "An unexpected error occurred.",
        }
        return Response(data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # If response is not None, DRF handled it.
    # We just want to format it consistently.

    # Default DRF error format is usually {"field": ["error"]} or {"detail": "error"}

    formatted_data = {
        "error": (
            response.reason_phrase if hasattr(response, "reason_phrase") else "Error"
        ),
        "message": "An error occurred.",
        "details": None,
    }

    if isinstance(exc, DRFValidationError):
        formatted_data["error"] = "Validation Error"
        formatted_data["message"] = "Invalid input."
        formatted_data["details"] = response.data
    elif "detail" in response.data:
        formatted_data["message"] = response.data["detail"]
        # If it's a specific error type, we might want to map it
        if response.status_code == 404:
            formatted_data["error"] = "Not Found"
        elif response.status_code == 403:
            formatted_data["error"] = "Permission Denied"
        elif response.status_code == 401:
            formatted_data["error"] = "Unauthorized"
    else:
        formatted_data["details"] = response.data

    response.data = formatted_data
    return response
