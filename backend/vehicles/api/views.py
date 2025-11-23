from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema

from vehicles.services.vehicle_service import VehicleService
from vehicles.api.serializers import (
    VehicleIdentificationRequestSerializer,
    VehicleResponseSerializer,
)
from core.exceptions import VehicleNotFoundException


class IdentifyVehicleView(APIView):
    """
    Identify vehicle by VIN or license plate.
    """

    permission_classes = []  # AllowAny

    @extend_schema(
        request=VehicleIdentificationRequestSerializer,
        responses={200: VehicleResponseSerializer},
        summary="Identify Vehicle",
        description=(
            "Identify a vehicle by VIN or License Plate + State "
            "to get details and glass options."
        ),
    )
    def post(self, request):
        serializer = VehicleIdentificationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = VehicleService()
        vin = serializer.validated_data.get("vin")
        # license_plate = serializer.validated_data.get("license_plate")
        # state = serializer.validated_data.get("state")

        try:
            if vin:
                data = service.identify_by_vin(vin)
            else:
                # TODO: Implement identify_by_plate in VehicleService
                # For now, mock or raise not implemented
                # data = service.identify_by_plate(license_plate, state)
                return Response(
                    {"error": "License plate lookup not implemented yet"},
                    status=status.HTTP_501_NOT_IMPLEMENTED,
                )

            # Transform data to match serializer structure if needed
            # The service returns a dict that roughly matches, but let's ensure structure
            response_data = {
                "vehicle": {
                    "vin": data.get("vin"),
                    "year": data.get("year"),
                    "make": data.get("make"),
                    "model": data.get("model"),
                    "style": data.get("style"),
                },
                "glass_options": data.get("glass_parts", []),
            }

            return Response(response_data, status=status.HTTP_200_OK)

        except VehicleNotFoundException as e:
            return Response({"error": str(e)}, status=status.HTTP_404_NOT_FOUND)
        except Exception:
            return Response(
                {"error": "An unexpected error occurred"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
