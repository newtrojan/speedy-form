from django.db import models  # noqa: F401
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from datetime import timedelta


class AutoboltAPICache(models.Model):
    """
    Cache for AUTOBOLT API responses to avoid repeat paid API calls.

    Stores the full JSON response from AUTOBOLT for:
    - VIN decode (/v2/decode)
    - Plate decode (/v2/decode-plate)
    - Part lookup (/v2/part/{oemPartNumber})

    Cache TTL is configurable (default 30 days) since vehicle data rarely changes.
    """

    REQUEST_TYPE_CHOICES = [
        ("vin_decode", "VIN Decode"),
        ("plate_decode", "Plate Decode"),
        ("part_lookup", "Part Lookup"),
    ]

    COUNTRY_CHOICES = [
        ("US", "United States"),
        ("CA", "Canada"),
    ]

    KIND_CHOICES = [
        ("Windshield", "Windshield"),
        ("Back", "Back Glass"),
    ]

    # === Request Identifiers ===
    request_type = models.CharField(
        _("request type"),
        max_length=20,
        choices=REQUEST_TYPE_CHOICES,
    )
    request_key = models.CharField(
        _("request key"),
        max_length=100,
        db_index=True,
        help_text="VIN, plate+state (e.g., 'ABC1234:WA'), or OEM part number",
    )
    country = models.CharField(
        _("country"),
        max_length=2,
        choices=COUNTRY_CHOICES,
        default="US",
    )
    kind = models.CharField(
        _("glass kind"),
        max_length=20,
        choices=KIND_CHOICES,
        default="Windshield",
    )

    # === Response Data (Full JSON) ===
    response_data = models.JSONField(
        _("response data"),
        help_text="Full JSON response from AUTOBOLT API",
    )
    http_status = models.IntegerField(
        _("HTTP status code"),
        help_text="HTTP status code from API response",
    )

    # === Extracted Key Fields (for quick queries) ===
    vin = models.CharField(
        _("VIN"),
        max_length=17,
        blank=True,
        null=True,
        db_index=True,
        help_text="Extracted VIN (from plate decode or VIN decode)",
    )
    year = models.PositiveIntegerField(
        _("year"),
        blank=True,
        null=True,
    )
    make = models.CharField(
        _("make"),
        max_length=100,
        blank=True,
        null=True,
    )
    model = models.CharField(
        _("model"),
        max_length=100,
        blank=True,
        null=True,
    )
    nags_part_number = models.CharField(
        _("NAGS part number"),
        max_length=20,
        blank=True,
        null=True,
        db_index=True,
        help_text="Primary NAGS/AM part number (e.g., FW04316GTYN)",
    )

    # === Timestamps ===
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(
        _("expires at"),
        help_text="Cache expiration (default: 30 days from creation)",
    )

    class Meta:
        verbose_name = _("AUTOBOLT API cache")
        verbose_name_plural = _("AUTOBOLT API cache entries")
        unique_together = ["request_type", "request_key", "country", "kind"]
        indexes = [
            models.Index(fields=["request_key", "request_type"]),
            models.Index(fields=["vin"]),
            models.Index(fields=["nags_part_number"]),
            models.Index(fields=["expires_at"]),
        ]

    def __str__(self):
        if self.vin:
            return f"{self.request_type}: {self.year} {self.make} {self.model}"
        return f"{self.request_type}: {self.request_key}"

    def save(self, *args, **kwargs):
        # Set default expiration to 30 days if not set
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=30)

        # Extract key fields from response_data for quick queries
        if self.response_data and self.http_status == 200:
            self.vin = self.response_data.get("vin")
            self.year = self.response_data.get("year")
            self.make = self.response_data.get("make")
            self.model = self.response_data.get("model")

            # Extract primary NAGS part number
            parts = self.response_data.get("parts", [])
            parts_by_id = self.response_data.get("partsById", {})
            if parts and parts[0] in parts_by_id:
                part = parts_by_id[parts[0]]
                self.nags_part_number = part.get("amNumber")

        super().save(*args, **kwargs)

    @property
    def is_expired(self) -> bool:
        """Check if cache entry has expired."""
        return timezone.now() > self.expires_at

    @property
    def is_valid(self) -> bool:
        """Check if cache entry is valid (not expired and successful response)."""
        return not self.is_expired and self.http_status == 200

    def get_parts(self) -> list:
        """Get list of part data from cached response."""
        if not self.response_data or self.http_status != 200:
            return []

        parts = self.response_data.get("parts", [])
        parts_by_id = self.response_data.get("partsById", {})

        return [parts_by_id[part_id] for part_id in parts if part_id in parts_by_id]

    def get_primary_part(self) -> dict | None:
        """Get the primary (first) part from cached response."""
        parts = self.get_parts()
        return parts[0] if parts else None

    def get_calibration_type(self) -> str | None:
        """Get calibration type name from primary part."""
        part = self.get_primary_part()
        if not part:
            return None

        calibrations = part.get("calibrations", [])
        if calibrations:
            return calibrations[0]["calibrationType"]["name"]
        return None

    def get_features(self) -> list[str]:
        """Get list of feature names from primary part."""
        part = self.get_primary_part()
        if not part:
            return []

        return [f["name"] for f in part.get("features", [])]

    def get_photo_urls(self) -> list[str]:
        """Get photo URLs from primary part."""
        part = self.get_primary_part()
        if not part:
            return []

        return part.get("photoUrls", [])

    @classmethod
    def get_cached_response(
        cls,
        request_type: str,
        request_key: str,
        country: str = "US",
        kind: str = "Windshield",
    ):
        """
        Get cached response if it exists and is not expired.

        Returns:
            AutoboltAPICache instance if valid cache exists, None otherwise.
        """
        try:
            cache_entry = cls.objects.get(
                request_type=request_type,
                request_key=request_key,
                country=country,
                kind=kind,
            )
            if cache_entry.is_valid:
                return cache_entry
            # Delete expired entry
            cache_entry.delete()
            return None
        except cls.DoesNotExist:
            return None

    @classmethod
    def cache_response(
        cls,
        request_type: str,
        request_key: str,
        country: str,
        kind: str,
        response_data: dict,
        http_status: int,
        ttl_days: int = 30,
    ):
        """
        Cache an API response.

        Args:
            request_type: Type of request (vin_decode, plate_decode, part_lookup)
            request_key: Unique key for the request
            country: Country code (US, CA)
            kind: Glass type (Windshield, Back)
            response_data: Full JSON response from API
            http_status: HTTP status code
            ttl_days: Cache TTL in days (default 30)

        Returns:
            AutoboltAPICache instance
        """
        expires_at = timezone.now() + timedelta(days=ttl_days)

        cache_entry, _ = cls.objects.update_or_create(
            request_type=request_type,
            request_key=request_key,
            country=country,
            kind=kind,
            defaults={
                "response_data": response_data,
                "http_status": http_status,
                "expires_at": expires_at,
            },
        )
        return cache_entry
