"""
Management command to create Django users for Chatwoot agents.

Creates support agent users with emails matching Chatwoot agent accounts.
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand

from support_dashboard.models import AgentProfile


User = get_user_model()

# Default agents to create - customize as needed
AGENTS = [
    {
        "username": "agent1",
        "email": "agent1@dokr.fyi",
        "first_name": "Agent",
        "last_name": "One",
        "password": "agent1pass123",
    },
    {
        "username": "agent2",
        "email": "agent2@dokr.fyi",
        "first_name": "Agent",
        "last_name": "Two",
        "password": "agent2pass123",
    },
    {
        "username": "akash",
        "email": "akash@dokr.fyi",
        "first_name": "Akash",
        "last_name": "Admin",
        "password": "akashpass123",
        "is_staff": True,
    },
]


class Command(BaseCommand):
    """
    Create Django users matching Chatwoot agents.

    Usage:
        python manage.py create_chatwoot_agents
        python manage.py create_chatwoot_agents --dry-run
    """

    help = "Create Django users for Chatwoot agents"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be created without making changes",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN - No changes will be made"))

        # Ensure Support Agent group exists
        support_group, created = Group.objects.get_or_create(name="Support Agent")
        if created:
            self.stdout.write(
                self.style.SUCCESS("Created 'Support Agent' group")
            )

        for agent_data in AGENTS:
            email = agent_data["email"]
            username = agent_data["username"]

            # Check if user already exists
            existing_user = User.objects.filter(email=email).first()
            if existing_user:
                self.stdout.write(
                    self.style.WARNING(f"User already exists: {email}")
                )
                # Ensure they have an AgentProfile
                if not dry_run:
                    profile, created = AgentProfile.objects.get_or_create(
                        user=existing_user,
                        defaults={"chatwoot_email": email},
                    )
                    if created:
                        self.stdout.write(
                            f"  Created AgentProfile for existing user"
                        )
                continue

            if dry_run:
                self.stdout.write(f"Would create user: {username} ({email})")
                continue

            # Create the user
            user = User.objects.create_user(
                username=username,
                email=email,
                password=agent_data["password"],
                first_name=agent_data.get("first_name", ""),
                last_name=agent_data.get("last_name", ""),
                is_staff=agent_data.get("is_staff", False),
            )

            # Add to Support Agent group
            user.groups.add(support_group)

            # Create AgentProfile
            AgentProfile.objects.create(
                user=user,
                chatwoot_email=email,
            )

            self.stdout.write(
                self.style.SUCCESS(f"Created user: {username} ({email})")
            )

        self.stdout.write(self.style.SUCCESS("\nDone!"))
        self.stdout.write(
            "Next step: Run 'python manage.py sync_chatwoot_agents' "
            "to link with Chatwoot agent IDs"
        )
