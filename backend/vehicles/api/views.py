import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema

from vehicles.services import VehicleLookupService, VehicleLookupError
from vehicles.api.serializers import (
    VehicleIdentificationRequestSerializer,
    VehicleLookupResponseSerializer,
)

logger = logging.getLogger(__name__)


class IdentifyVehicleView(APIView):
    """
    Identify vehicle by VIN or license plate.

    Uses VehicleLookupService which orchestrates:
    - AUTOBOLT API (primary, paid, cached)
    - NHTSA API (fallback, free)
    - NAGS database (backup, read-only)
    """

    permission_classes = []  # AllowAny

    @extend_schema(
        request=VehicleIdentificationRequestSerializer,
        responses={200: VehicleLookupResponseSerializer},
        summary="Identify Vehicle",
        description=(
            "Identify a vehicle by VIN or License Plate + State "
            "to get details and glass part options."
        ),
    )
    def post(self, request):
        serializer = VehicleIdentificationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        vin = serializer.validated_data.get("vin")
        license_plate = serializer.validated_data.get("license_plate")
        state = serializer.validated_data.get("state")

        try:
            service = VehicleLookupService()

            if vin:
                result = service.lookup_by_vin(vin)
            elif license_plate and state:
                result = service.lookup_by_plate(license_plate, state)
            else:
                return Response(
                    {"error": "Must provide VIN or license plate + state"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Return the result as dict
            return Response(result.to_dict(), status=status.HTTP_200_OK)

        except VehicleLookupError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception:
            logger.exception("Error identifying vehicle")
            return Response(
                {"error": "An unexpected error occurred"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
