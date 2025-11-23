import re


def validate_vin(vin: str) -> bool:
    """
    Validates a VIN using the standard check digit algorithm (ISO 3779).
    """
    if not vin:
        return False

    vin = vin.upper()
    if len(vin) != 17:
        return False

    # I, O, and Q are not allowed in VINs
    if any(char in vin for char in "IOQ"):
        return False

    # Transliteration values for letters
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

    # Weights for each position
    weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2]

    checksum = 0
    for i, char in enumerate(vin):
        if i == 8:  # Skip check digit position for now
            continue

        if char.isdigit():
            value = int(char)
        elif char in transliteration:
            value = transliteration[char]
        else:
            return False  # Invalid character

        checksum += value * weights[i]

    remainder = checksum % 11
    check_digit = "X" if remainder == 10 else str(remainder)

    return vin[8] == check_digit


def validate_plate_format(plate: str, state: str) -> bool:
    """
    Basic validation for license plate format.
    """
    if not plate or not state:
        return False

    if len(state) != 2:
        return False

    # Basic alphanumeric check for plate, allowing spaces/dashes
    if not re.match(r"^[A-Z0-9\s-]+$", plate.upper()):
        return False

    return True
