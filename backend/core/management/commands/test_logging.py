import logging
from django.core.management.base import BaseCommand
from core.services.base_service import BaseService


class Command(BaseCommand):
    help = "Test logging configuration"

    def handle(self, *args, **kwargs):
        # Test Root Logger
        root_logger = logging.getLogger("root_test")
        root_logger.info("Root logger test message", extra={"test_id": 123})

        # Test Service Logger
        service = BaseService()
        service.log_info(
            "Service logger test message", extra={"user_id": 456, "action": "test"}
        )
        service.log_error("Service error test message", extra={"error_code": "E500"})
