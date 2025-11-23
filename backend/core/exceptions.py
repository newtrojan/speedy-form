class ServiceException(Exception):
    """Base exception for all service layer errors."""

    default_detail = "A service error occurred."
    default_code = "service_error"

    def __init__(self, detail=None, code=None):
        if detail is None:
            detail = self.default_detail
        if code is None:
            code = self.default_code
        self.detail = detail
        self.code = code
        super().__init__(detail)


class VehicleNotFoundException(ServiceException):
    default_detail = "Vehicle not found."
    default_code = "vehicle_not_found"


class ServiceAreaNotFoundException(ServiceException):
    default_detail = "Service area not found."
    default_code = "service_area_not_found"


class PricingCalculationError(ServiceException):
    default_detail = "Error calculating price."
    default_code = "pricing_calculation_error"


class AutoboltAPIError(ServiceException):
    default_detail = "Error communicating with vehicle data provider."
    default_code = "autobolt_api_error"


class InvalidVINError(ServiceException):
    default_detail = "Invalid VIN."
    default_code = "invalid_vin"


class InvalidPlateError(ServiceException):
    default_detail = "Invalid license plate or state."
    default_code = "invalid_plate"
