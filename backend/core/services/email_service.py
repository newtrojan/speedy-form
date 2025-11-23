import secrets
import hashlib
import logging
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
from core.services.base_service import BaseService
from quotes.models import Quote

logger = logging.getLogger(__name__)


class EmailService(BaseService):
    """
    Service for handling email communications.
    """

    def send_quote(self, quote: Quote) -> bool:
        """
        Generates a secure token, updates the quote, and sends the quote email.
        """
        try:
            # Generate secure token
            token = self.generate_secure_token()
            token_hash = self.hash_token(token)

            # Update quote with token hash
            quote.approval_token_hash = token_hash
            quote.approval_token_created_at = timezone.now()
            quote.save(
                update_fields=["approval_token_hash", "approval_token_created_at"]
            )

            # Build context
            vehicle_desc = (
                f"{quote.vehicle_info.get('year')} "
                f"{quote.vehicle_info.get('make')} "
                f"{quote.vehicle_info.get('model')}"
            )
            # In production, this URL would come from settings
            approval_link = (
                f"http://localhost:3000/quotes/approve/{quote.id}?token={token}"
            )

            context = {
                "quote": quote,
                "vehicle_desc": vehicle_desc,
                "line_items": quote.line_items.all(),
                "approval_link": approval_link,
            }

            html_message = render_to_string("emails/quote_email.html", context)
            subject = f"Your Auto Glass Quote - {vehicle_desc}"

            send_mail(
                subject=subject,
                message=f"Please view your quote here: {approval_link}",  # Fallback
                html_message=html_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[quote.customer.email],
                fail_silently=False,
            )

            self.log_info(
                f"Quote email sent to {quote.customer.email} for quote {quote.id}"
            )
            return True

        except Exception as e:
            self.log_error(f"Failed to send quote email for {quote.id}: {str(e)}")
            return False

    def send_rejection(self, quote: Quote, reason: str) -> bool:
        """
        Sends a rejection email.
        """
        try:
            vehicle_desc = (
                f"{quote.vehicle_info.get('year')} "
                f"{quote.vehicle_info.get('make')} "
                f"{quote.vehicle_info.get('model')}"
            )

            context = {
                "quote": quote,
                "vehicle_desc": vehicle_desc,
                "reason": reason,
            }

            html_message = render_to_string("emails/rejection_email.html", context)
            subject = f"Update on Your Quote Request - {vehicle_desc}"

            send_mail(
                subject=subject,
                message=f"Your quote request could not be processed. Reason: {reason}",
                html_message=html_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[quote.customer.email],
                fail_silently=False,
            )

            self.log_info(
                f"Rejection email sent to {quote.customer.email} for quote {quote.id}"
            )
            return True

        except Exception as e:
            self.log_error(f"Failed to send rejection email for {quote.id}: {str(e)}")
            return False

    def send_approval_confirmation(self, quote: Quote) -> bool:
        """
        Sends an approval confirmation email.
        """
        try:
            vehicle_desc = (
                f"{quote.vehicle_info.get('year')} "
                f"{quote.vehicle_info.get('make')} "
                f"{quote.vehicle_info.get('model')}"
            )
            scheduling_link = "http://localhost:3000/schedule"  # Placeholder

            context = {
                "quote": quote,
                "vehicle_desc": vehicle_desc,
                "scheduling_link": scheduling_link,
            }

            html_message = render_to_string(
                "emails/approval_confirmation.html", context
            )
            subject = f"Quote Approved - Next Steps for your {vehicle_desc}"

            send_mail(
                subject=subject,
                message=(
                    "Your quote has been approved! " "Please schedule your appointment."
                ),
                html_message=html_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[quote.customer.email],
                fail_silently=False,
            )

            self.log_info(
                f"Approval confirmation email sent to {quote.customer.email} "
                f"for quote {quote.id}"
            )
            return True

        except Exception as e:
            self.log_error(
                f"Failed to send approval confirmation email for "
                f"{quote.id}: {str(e)}"
            )
            return False

    def generate_secure_token(self) -> str:
        """
        Generates a cryptographically secure URL-safe token.
        """
        return secrets.token_urlsafe(32)

    def hash_token(self, token: str) -> str:
        """
        Hashes a token using SHA256.
        """
        return hashlib.sha256(token.encode()).hexdigest()
