"""
Vehicle services for VIN/plate lookup and parts identification.

Main entry point is VehicleLookupService which orchestrates:
- AUTOBOLT API (primary, paid, cached)
- NHTSA API (fallback, free)
- NAGS database (backup, read-only)
"""

from vehicles.services.autobolt_client import AutoboltClient
from vehicles.services.nags_client import NAGSClient, NAGSLookupError
from vehicles.services.nhtsa_client import NHTSAClient, NHTSAAPIError
from vehicles.services.types import GlassPart, VehicleLookupResult
from vehicles.services.vehicle_lookup import VehicleLookupError, VehicleLookupService

__all__ = [
    # Main orchestrator
    "VehicleLookupService",
    # Individual clients
    "AutoboltClient",
    "NHTSAClient",
    "NAGSClient",
    # Types
    "VehicleLookupResult",
    "GlassPart",
    # Errors
    "VehicleLookupError",
    "NHTSAAPIError",
    "NAGSLookupError",
]
