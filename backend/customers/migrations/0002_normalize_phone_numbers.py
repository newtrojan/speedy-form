"""
Data migration to normalize existing phone numbers to E.164 format.

E.164 format: +[country code][number] (e.g., +12049631621)
This is required by SMS providers (Twilio) and Chatwoot.
"""

import re

from django.db import migrations


def normalize_phone_e164(phone):
    """Normalize phone number to E.164 format (+1XXXXXXXXXX)."""
    if not phone:
        return phone

    # Remove all non-digit characters except leading +
    cleaned = re.sub(r"[^\d+]", "", phone)

    # If already starts with +, it's formatted - just return cleaned version
    if cleaned.startswith("+"):
        return cleaned

    # Remove leading zeros
    cleaned = cleaned.lstrip("0")

    # 10-digit US number -> add +1
    if len(cleaned) == 10:
        return f"+1{cleaned}"

    # 11-digit starting with 1 (US with country code) -> add +
    if len(cleaned) == 11 and cleaned.startswith("1"):
        return f"+{cleaned}"

    # For other formats with enough digits, assume US and add +1
    if len(cleaned) >= 7:
        return f"+1{cleaned}"

    # Return as-is if we can't normalize
    return phone


def normalize_customer_phones(apps, schema_editor):
    """Normalize all existing customer phone numbers to E.164 format."""
    Customer = apps.get_model("customers", "Customer")

    updated_count = 0
    for customer in Customer.objects.all():
        if customer.phone:
            normalized = normalize_phone_e164(customer.phone)
            if normalized != customer.phone:
                customer.phone = normalized
                customer.save(update_fields=["phone"])
                updated_count += 1

    if updated_count > 0:
        print(f"\n  Normalized {updated_count} phone number(s) to E.164 format")


def reverse_noop(apps, schema_editor):
    """No reverse operation - phone normalization is not reversible."""
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("customers", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(normalize_customer_phones, reverse_noop),
    ]
