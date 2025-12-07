import logging
import os
from typing import Optional

import requests
from django.contrib.gis.geos import Point

logger = logging.getLogger(__name__)


def geocode_postal_code(postal_code: str) -> Optional[Point]:
    """
    Geocodes a postal code to a Point (latitude, longitude) using Google Maps Geocoding API.
    """
    api_key = os.environ.get("GOOGLE_GEOCODING_API_KEY")
    if not api_key:
        logger.error("GOOGLE_GEOCODING_API_KEY not set")
        return None

    try:
        response = requests.get(
            "https://maps.googleapis.com/maps/api/geocode/json",
            params={
                "address": postal_code,
                "components": "country:US",
                "key": api_key,
            },
            timeout=10,
        )
        response.raise_for_status()

        data = response.json()
        if data.get("status") == "OK" and data.get("results"):
            location = data["results"][0]["geometry"]["location"]
            return Point(location["lng"], location["lat"], srid=4326)

        logger.warning(f"Geocoding failed for {postal_code}: {data.get('status')}")
        return None

    except requests.RequestException as e:
        logger.error(f"Geocoding request failed: {e}")
        return None


def geocode_address(
    street: str, city: str, state: str, postal_code: str
) -> Optional[Point]:
    """
    Geocodes a full address to a Point using Google Maps Geocoding API.
    """
    api_key = os.environ.get("GOOGLE_GEOCODING_API_KEY")
    if not api_key:
        logger.error("GOOGLE_GEOCODING_API_KEY not set")
        return None

    address = f"{street}, {city}, {state} {postal_code}"

    try:
        response = requests.get(
            "https://maps.googleapis.com/maps/api/geocode/json",
            params={
                "address": address,
                "components": "country:US",
                "key": api_key,
            },
            timeout=10,
        )
        response.raise_for_status()

        data = response.json()
        if data.get("status") == "OK" and data.get("results"):
            location = data["results"][0]["geometry"]["location"]
            return Point(location["lng"], location["lat"], srid=4326)

        logger.warning(f"Geocoding failed for {address}: {data.get('status')}")
        return None

    except requests.RequestException as e:
        logger.error(f"Geocoding request failed: {e}")
        return None
