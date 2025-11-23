import logging
from typing import Dict, Any, List, Optional

from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.measure import D
from django.contrib.gis.geos import Point

from core.services.base_service import BaseService
from shops.models import Shop
from shops.services.geocoding import geocode_postal_code, geocode_address
from pricing.models import PricingConfig

logger = logging.getLogger(__name__)


class ServiceabilityService(BaseService):
    """
    Service for checking if a location is serviceable.
    """

    def check_in_store(self, postal_code: str) -> Dict[str, Any]:
        """
        Check if we have a shop near the postal code.
        """
        self.log_info(f"Checking in-store serviceability for {postal_code}")

        # 1. Geocode the postal code to get coordinates
        location = geocode_postal_code(postal_code)
        if not location:
            return {
                "is_serviceable": False,
                "message": "Invalid postal code or location not found.",
            }

        # 2. Find nearest shop
        nearest_shops = self.find_nearby_shops(location, radius_miles=50)

        if not nearest_shops:
            return {
                "is_serviceable": False,
                "message": "No shops found within 50 miles.",
                "nearby_shops": [],
            }

        best_shop = nearest_shops[0]

        return {
            "is_serviceable": True,
            "shop": self._format_shop(best_shop),
            "distance_miles": getattr(best_shop, "distance", D(mi=0)).mi,
        }

    def check_mobile(
        self,
        postal_code: str,
        street: Optional[str] = None,
        city: Optional[str] = None,
        state: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Check if mobile service is available at the location.
        """
        self.log_info(f"Checking mobile serviceability for {postal_code}")

        # 1. Geocode
        location: Optional[Point] = None
        if street and city and state:
            location = geocode_address(street, city, state, postal_code)
        else:
            location = geocode_postal_code(postal_code)

        if not location:
            return {
                "is_serviceable": False,
                "message": "Location not found.",
            }

        # 2. Find shops that offer mobile service covering this location
        shops = (
            Shop.objects.filter(offers_mobile_service=True)
            .annotate(distance=Distance("location", location))
            .filter(distance__lte=D(mi=50))  # Hard limit optimization
        )

        for shop in shops:
            distance_miles = shop.distance.mi
            if distance_miles <= shop.max_mobile_radius_miles:
                # Found a serviceable shop
                config = PricingConfig.get_instance()
                fee = config.calculate_mobile_fee(distance_miles)

                if fee is None:
                    continue

                self.log_info(
                    f"Found mobile service from {shop.name} ({distance_miles:.2f} mi)"
                )
                return {
                    "is_serviceable": True,
                    "service_type": "mobile",
                    "shop": self._format_shop(shop),
                    "distance_miles": round(distance_miles, 2),
                    "mobile_fee": fee,
                    "message": "Mobile service available!",
                }

        self.log_info(f"No mobile service found for {postal_code}")
        return {
            "is_serviceable": False,
            "service_type": "mobile",
            "message": "Mobile service not available at this location.",
        }

    def find_nearby_shops(self, location: Point, radius_miles: int = 50) -> List[Shop]:
        """
        Finds shops within a certain radius of a Point.
        """
        return list(
            Shop.objects.annotate(distance=Distance("location", location))
            .filter(distance__lte=D(mi=radius_miles))
            .order_by("distance")
        )

    def get_nearby_shops(self, postal_code: str, limit: int = 3) -> List[Shop]:
        """
        Finds shops near a postal code centroid.
        """
        location = geocode_postal_code(postal_code)
        if not location:
            return []
        return self.find_nearby_shops(location, radius_miles=50)[:limit]

    def _format_shop(self, shop: Shop) -> Dict[str, Any]:
        return {
            "id": shop.id,
            "name": shop.name,
            "address": shop.get_full_address(),
            "phone": shop.phone,
            "city": shop.city,
            "state": shop.state,
            "postal_code": shop.postal_code,
        }
