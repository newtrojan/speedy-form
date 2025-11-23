import logging
from typing import Any, Dict, Optional


class BaseService:
    """
    Base class for all services.
    Provides common functionality like logging.
    """

    def __init__(self):
        self.logger = logging.getLogger(f"{self.__module__}.{self.__class__.__name__}")

    def log_info(self, message: str, extra: Optional[Dict[str, Any]] = None):
        self.logger.info(message, extra=extra)

    def log_error(self, message: str, extra: Optional[Dict[str, Any]] = None):
        self.logger.error(message, extra=extra)

    def log_warning(self, message: str, extra: Optional[Dict[str, Any]] = None):
        self.logger.warning(message, extra=extra)

    def log_debug(self, message: str, extra: Optional[Dict[str, Any]] = None):
        self.logger.debug(message, extra=extra)
