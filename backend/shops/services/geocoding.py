from typing import Optional
from django.contrib.gis.geos import Point


def geocode_postal_code(postal_code: str) -> Optional[Point]:
    """
    Geocodes a postal code to a Point (latitude, longitude).
    For MVP, this is a stub that returns approximate centroids for known test ZIPs.
    In production, this would call Google Maps Geocoding API.
    """
    # Stub data for testing
    stub_data = {
        "94105": Point(-122.3965, 37.7910, srid=4326),  # San Francisco
        "10118": Point(-73.9857, 40.7484, srid=4326),  # New York
        "10001": Point(-73.9967, 40.7484, srid=4326),  # New York (Stub)
        "78701": Point(-97.7431, 30.2672, srid=4326),  # Austin
        "80202": Point(-104.9903, 39.7392, srid=4326),  # Denver
        "33139": Point(-80.1918, 25.7617, srid=4326),  # Miami
    }
    return stub_data.get(postal_code)


def geocode_address(
    street: str, city: str, state: str, postal_code: str
) -> Optional[Point]:
    """
    Geocodes a full address to a Point.
    Stub implementation.
    """
    # For MVP, just fall back to postal code centroid
    return geocode_postal_code(postal_code)
