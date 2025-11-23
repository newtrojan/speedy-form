from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema

from shops.services.serviceability import ServiceabilityService
from shops.api.serializers import (
    ServiceabilityRequestSerializer,
    ServiceabilityResponseSerializer,
)


class CheckInStoreServiceView(APIView):
    """
    Check if in-store service is available for a postal code.
    """

    permission_classes = []

    @extend_schema(
        request=ServiceabilityRequestSerializer,
        responses={200: ServiceabilityResponseSerializer},
        summary="Check In-Store Service",
    )
    def post(self, request):
        serializer = ServiceabilityRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = ServiceabilityService()
        result = service.check_in_store(
            postal_code=serializer.validated_data["postal_code"]
        )

        return Response(result, status=status.HTTP_200_OK)


class CheckMobileServiceView(APIView):
    """
    Check if mobile service is available for a location.
    """

    permission_classes = []

    @extend_schema(
        request=ServiceabilityRequestSerializer,
        responses={200: ServiceabilityResponseSerializer},
        summary="Check Mobile Service",
    )
    def post(self, request):
        serializer = ServiceabilityRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = ServiceabilityService()
        result = service.check_mobile(
            postal_code=serializer.validated_data["postal_code"],
            street=serializer.validated_data.get("street_address"),
            city=serializer.validated_data.get("city"),
            state=serializer.validated_data.get("state"),
        )

        return Response(result, status=status.HTTP_200_OK)
