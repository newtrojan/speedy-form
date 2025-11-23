from typing import Dict, Any
from django.conf import settings
from core.services.base_service import BaseService
from core.exceptions import (
    VehicleNotFoundException,
    InvalidVINError,
    InvalidPlateError,
    AutoboltAPIError,
)
from vehicles.models import MockVehicleData
from vehicles.validators import validate_vin, validate_plate_format
from vehicles.services.autobolt_client import AutoboltClient


class VehicleService(BaseService):
    """
    Service for identifying vehicles and retrieving their details.
    """

    def __init__(self):
        super().__init__()
        self.autobolt_client = AutoboltClient()

    def identify_by_vin(self, vin: str, use_mock: bool = True) -> Dict[str, Any]:
        """
        Identify a vehicle by its VIN.
        """
        if not validate_vin(vin):
            raise InvalidVINError(f"Invalid VIN: {vin}")

        self.log_info(f"Identifying vehicle by VIN: {vin}")

        # 1. Try Mock Data (if enabled)
        if use_mock and getattr(settings, "USE_MOCK_VEHICLE_DATA", True):
            try:
                vehicle = MockVehicleData.objects.get(vin=vin)
                self.log_info(f"Found vehicle in mock data: {vin}")
                return self._format_vehicle_response(vehicle)
            except MockVehicleData.DoesNotExist:
                self.log_info(f"Vehicle not found in mock data: {vin}")

        # 2. Try AUTOBOLT API
        try:
            data = self.autobolt_client.decode_vin(vin)
            self.log_info(f"Found vehicle via AUTOBOLT: {vin}")
            return data
        except AutoboltAPIError as e:
            self.log_error(f"AUTOBOLT API error for VIN {vin}: {str(e)}")
            raise e
        except Exception as e:
            self.log_error(f"Unexpected error identifying VIN {vin}: {str(e)}")
            raise VehicleNotFoundException(
                f"Could not identify vehicle with VIN: {vin}"
            )

    def identify_by_plate(
        self, plate: str, state: str, use_mock: bool = True
    ) -> Dict[str, Any]:
        """
        Identify a vehicle by license plate and state.
        """
        if not validate_plate_format(plate, state):
            raise InvalidPlateError(f"Invalid plate/state: {plate} {state}")

        self.log_info(f"Identifying vehicle by plate: {plate} ({state})")

        # 1. Try Mock Data
        if use_mock and getattr(settings, "USE_MOCK_VEHICLE_DATA", True):
            try:
                vehicle = MockVehicleData.objects.get(
                    license_plate=plate, state=state.upper()
                )
                self.log_info(f"Found vehicle in mock data: {plate}")
                return self._format_vehicle_response(vehicle)
            except MockVehicleData.DoesNotExist:
                self.log_info(f"Vehicle not found in mock data: {plate}")

        # 2. Try AUTOBOLT API
        try:
            data = self.autobolt_client.lookup_plate(plate, state)
            self.log_info(f"Found vehicle via AUTOBOLT: {plate}")
            return data
        except AutoboltAPIError as e:
            self.log_error(f"AUTOBOLT API error for plate {plate}: {str(e)}")
            raise e
        except Exception as e:
            self.log_error(f"Unexpected error identifying plate {plate}: {str(e)}")
            raise VehicleNotFoundException(
                f"Could not identify vehicle with plate: {plate}"
            )

    def _format_vehicle_response(self, vehicle: MockVehicleData) -> Dict[str, Any]:
        """
        Formats a MockVehicleData object into a standard response dictionary.
        """
        return {
            "vin": vehicle.vin,
            "year": vehicle.year,
            "make": vehicle.make,
            "model": vehicle.model,
            "trim": vehicle.trim,
            "body_style": vehicle.body_style,
            "license_plate": vehicle.license_plate,
            "state": vehicle.state,
            "glass_parts": vehicle.glass_parts,
        }
