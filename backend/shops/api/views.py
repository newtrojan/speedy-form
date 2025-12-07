from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema, OpenApiParameter

from shops.services.serviceability import ServiceabilityService
from shops.services.geocoding import geocode_postal_code
from shops.api.serializers import (
    ServiceabilityRequestSerializer,
    ServiceabilityResponseSerializer,
    ShopsNearbyResponseSerializer,
)
from pricing.models import PricingConfig


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


class ShopsNearbyView(APIView):
    """
    Get shops sorted by distance from a postal code.
    Returns top shops with distance and mobile service info.
    """

    permission_classes = []

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="postal_code",
                type=str,
                required=True,
                description="Postal code to search from",
            ),
        ],
        responses={200: ShopsNearbyResponseSerializer},
        summary="Get Nearby Shops",
    )
    def get(self, request):
        postal_code = request.query_params.get("postal_code")

        if not postal_code:
            return Response(
                {"error": "postal_code is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Geocode postal code
        location = geocode_postal_code(postal_code)
        if not location:
            return Response(
                {
                    "postal_code": postal_code,
                    "shops": [],
                    "mobile_available": False,
                    "closest_shop_distance": None,
                    "error": "Invalid postal code or location not found",
                },
                status=status.HTTP_200_OK,
            )

        # Find nearby shops using existing service
        service = ServiceabilityService()
        nearby_shops = service.find_nearby_shops(location, radius_miles=500)

        # Get pricing config for mobile fee calculation
        config = PricingConfig.get_instance()

        # Format shops with distance and mobile info
        shops_data = []
        mobile_available = False

        for shop in nearby_shops:
            distance_miles = round(shop.distance.mi, 2)

            # Check if mobile service is available from this shop
            shop_offers_mobile = (
                shop.offers_mobile_service
                and distance_miles <= shop.max_mobile_radius_miles
            )

            # Calculate mobile fee if within range
            mobile_fee = None
            if shop_offers_mobile:
                mobile_available = True
                mobile_fee = config.calculate_mobile_fee(distance_miles)

            shops_data.append(
                {
                    "id": shop.id,
                    "name": shop.name,
                    "address": shop.get_full_address(),
                    "city": shop.city,
                    "state": shop.state,
                    "postal_code": shop.postal_code,
                    "phone": shop.phone,
                    "email": shop.email,
                    "distance_miles": distance_miles,
                    "offers_mobile_service": shop_offers_mobile,
                    "mobile_fee": mobile_fee,
                    "max_mobile_radius_miles": shop.max_mobile_radius_miles,
                }
            )

        closest_distance = shops_data[0]["distance_miles"] if shops_data else None

        return Response(
            {
                "postal_code": postal_code,
                "shops": shops_data,
                "mobile_available": mobile_available,
                "closest_shop_distance": closest_distance,
            },
            status=status.HTTP_200_OK,
        )
