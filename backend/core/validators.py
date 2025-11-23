"""
Custom validators for input validation.
"""

import re
from django.core.exceptions import ValidationError


def validate_vin_checksum(vin):
    """
    Validate VIN using NHTSA checksum algorithm.
    """
    if not vin or len(vin) != 17:
        raise ValidationError("VIN must be exactly 17 characters")

    # VIN transliteration table
    transliteration = {
        "A": 1,
        "B": 2,
        "C": 3,
        "D": 4,
        "E": 5,
        "F": 6,
        "G": 7,
        "H": 8,
        "J": 1,
        "K": 2,
        "L": 3,
        "M": 4,
        "N": 5,
        "P": 7,
        "R": 9,
        "S": 2,
        "T": 3,
        "U": 4,
        "V": 5,
        "W": 6,
        "X": 7,
        "Y": 8,
        "Z": 9,
    }

    # Weight factors
    weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2]

    vin = vin.upper()

    # Check for invalid characters
    if not re.match(r"^[A-HJ-NPR-Z0-9]{17}$", vin):
        raise ValidationError("VIN contains invalid characters (I, O, Q not allowed)")

    # Calculate checksum
    total = 0
    for i, char in enumerate(vin):
        if char.isdigit():
            value = int(char)
        else:
            value = transliteration.get(char, 0)
        total += value * weights[i]

    check_digit = total % 11
    if check_digit == 10:
        check_digit = "X"
    else:
        check_digit = str(check_digit)

    # Validate 9th position (check digit)
    if vin[8] != check_digit:
        raise ValidationError("Invalid VIN checksum")


def validate_phone_e164(phone):
    """
    Validate phone number in E.164 format (+1XXXXXXXXXX).
    """
    if not phone:
        return

    pattern = r"^\+[1-9]\d{1,14}$"
    if not re.match(pattern, phone):
        raise ValidationError(
            "Phone number must be in E.164 format (e.g., +14155551234)"
        )


def validate_postal_code(postal_code):
    """
    Validate US/Canada postal codes.
    """
    if not postal_code:
        return

    # US ZIP code (5 digits or 5+4)
    us_pattern = r"^\d{5}(-\d{4})?$"
    # Canada postal code (A1A 1A1 or A1A1A1)
    ca_pattern = r"^[A-Z]\d[A-Z]\s?\d[A-Z]\d$"

    if not (
        re.match(us_pattern, postal_code) or re.match(ca_pattern, postal_code.upper())
    ):
        raise ValidationError(
            "Invalid postal code format (US: 12345 or 12345-6789, " "Canada: A1A 1A1)"
        )
