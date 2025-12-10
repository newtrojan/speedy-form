"""
Management command to sync Django users with Chatwoot agents.

Fetches agent IDs from Chatwoot and updates AgentProfile records.
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from integrations.chatwoot.client import ChatwootClient, ChatwootError
from support_dashboard.models import AgentProfile


User = get_user_model()


class Command(BaseCommand):
    """
    Sync Django support agents with Chatwoot agents.

    Matches agents by email and stores Chatwoot agent IDs in AgentProfile.

    Usage:
        python manage.py sync_chatwoot_agents
        python manage.py sync_chatwoot_agents --email=akash@dokr.fyi
        python manage.py sync_chatwoot_agents --dry-run
    """

    help = "Sync Django users with Chatwoot agents by matching emails"

    def add_arguments(self, parser):
        parser.add_argument(
            "--email",
            type=str,
            help="Sync only a specific agent by email",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be synced without making changes",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        specific_email = options.get("email")

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN - No changes will be made"))

        # Initialize Chatwoot client
        client = ChatwootClient()

        if not client.is_configured:
            self.stdout.write(
                self.style.ERROR(
                    "Chatwoot is not configured. "
                    "Set CHATWOOT_BASE_URL and CHATWOOT_API_TOKEN in .env"
                )
            )
            return

        # Fetch all agents from Chatwoot
        try:
            chatwoot_agents = client.get_agents()
            self.stdout.write(
                f"Found {len(chatwoot_agents)} agents in Chatwoot"
            )
        except ChatwootError as e:
            self.stdout.write(
                self.style.ERROR(f"Failed to fetch Chatwoot agents: {e.message}")
            )
            return

        # Build email -> agent_id mapping
        chatwoot_map = {}
        for agent in chatwoot_agents:
            email = agent.get("email", "").lower()
            agent_id = agent.get("id")
            if email and agent_id:
                chatwoot_map[email] = {
                    "id": agent_id,
                    "name": agent.get("name", ""),
                    "email": email,
                }
                self.stdout.write(f"  Chatwoot agent: {email} (ID: {agent_id})")

        if not chatwoot_map:
            self.stdout.write(
                self.style.WARNING("No agents found in Chatwoot")
            )
            return

        # Get Django users with AgentProfile
        if specific_email:
            profiles = AgentProfile.objects.filter(
                chatwoot_email__iexact=specific_email
            ).select_related("user")
            if not profiles.exists():
                # Try matching by user email
                profiles = AgentProfile.objects.filter(
                    user__email__iexact=specific_email
                ).select_related("user")
        else:
            profiles = AgentProfile.objects.select_related("user").all()

        if not profiles.exists():
            self.stdout.write(
                self.style.WARNING(
                    "No AgentProfiles found. "
                    "Run 'python manage.py create_chatwoot_agents' first."
                )
            )
            return

        self.stdout.write(f"\nSyncing {profiles.count()} Django agent profiles...")

        synced_count = 0
        for profile in profiles:
            # Try chatwoot_email first, then user.email
            email = (profile.chatwoot_email or profile.user.email or "").lower()

            if email in chatwoot_map:
                chatwoot_data = chatwoot_map[email]
                agent_id = chatwoot_data["id"]

                if dry_run:
                    self.stdout.write(
                        f"Would link: {profile.user.username} ({email}) "
                        f"-> Chatwoot ID {agent_id}"
                    )
                else:
                    profile.chatwoot_agent_id = agent_id
                    profile.chatwoot_email = email
                    profile.is_chatwoot_synced = True
                    profile.synced_at = timezone.now()
                    profile.save()

                    self.stdout.write(
                        self.style.SUCCESS(
                            f"Linked: {profile.user.username} ({email}) "
                            f"-> Chatwoot ID {agent_id}"
                        )
                    )
                synced_count += 1
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f"No Chatwoot match for: {profile.user.username} ({email})"
                    )
                )

        self.stdout.write(
            self.style.SUCCESS(f"\nSynced {synced_count} agent(s)")
        )
