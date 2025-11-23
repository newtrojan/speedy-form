from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from core.exceptions import ServiceException


def custom_exception_handler(exc, context):
    """
    Custom exception handler that handles ServiceException
    and formats it into a standard DRF response.
    """
    # Call REST framework's default exception handler first,
    # to get the standard error response.
    response = exception_handler(exc, context)

    # If response is None, then it's an exception that DRF doesn't handle
    # by default (like our ServiceException).
    if response is None:
        if isinstance(exc, ServiceException):
            data = {"detail": exc.detail, "code": exc.code}
            return Response(data, status=status.HTTP_400_BAD_REQUEST)

    return response
