from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group

User = get_user_model()


class Command(BaseCommand):
    help = "Creates staff users for CSR dashboard (CSRs, Division Managers, Network Managers)"

    def handle(self, *args, **options):
        # Ensure Support Agent group exists
        support_group, created = Group.objects.get_or_create(name="Support Agent")
        if created:
            self.stdout.write(self.style.SUCCESS("Created 'Support Agent' group"))

        users: list[dict] = [
            # CSRs - basic support agents
            {
                "username": "csr1",
                "email": "csr1@speedy.com",
                "password": "password123",
                "first_name": "Carlos",
                "last_name": "Rodriguez",
                "is_staff": False,
                "is_superuser": False,
                "groups": ["Support Agent"],
            },
            {
                "username": "csr2",
                "email": "csr2@speedy.com",
                "password": "password123",
                "first_name": "Sarah",
                "last_name": "Johnson",
                "is_staff": False,
                "is_superuser": False,
                "groups": ["Support Agent"],
            },
            {
                "username": "csr3",
                "email": "csr3@speedy.com",
                "password": "password123",
                "first_name": "Mike",
                "last_name": "Chen",
                "is_staff": False,
                "is_superuser": False,
                "groups": ["Support Agent"],
            },
            # Division Managers - Support Agent + is_staff for Django admin access
            {
                "username": "dm1",
                "email": "dm1@speedy.com",
                "password": "password123",
                "first_name": "David",
                "last_name": "Martinez",
                "is_staff": True,
                "is_superuser": False,
                "groups": ["Support Agent"],
            },
            {
                "username": "dm2",
                "email": "dm2@speedy.com",
                "password": "password123",
                "first_name": "Emily",
                "last_name": "Thompson",
                "is_staff": True,
                "is_superuser": False,
                "groups": ["Support Agent"],
            },
            # Network Manager - superuser with full access
            {
                "username": "nm1",
                "email": "nm1@speedy.com",
                "password": "password123",
                "first_name": "Robert",
                "last_name": "Wilson",
                "is_staff": True,
                "is_superuser": True,
                "groups": ["Support Agent"],
            },
        ]

        created_count = 0
        for user_data in users:
            username: str = user_data["username"]
            email: str = user_data["email"]

            # Check if user exists by email or username
            if User.objects.filter(username=username).exists():
                self.stdout.write(f"User exists: {username}")
                continue

            if User.objects.filter(email=email).exists():
                self.stdout.write(f"Email exists: {email}")
                continue

            user = User.objects.create_user(
                username=username,
                email=email,
                password=user_data["password"],
                first_name=user_data.get("first_name", ""),
                last_name=user_data.get("last_name", ""),
                is_staff=user_data["is_staff"],
                is_superuser=user_data["is_superuser"],
            )
            created_count += 1

            # Determine role for display
            if user_data["is_superuser"]:
                role = "Network Manager"
            elif user_data["is_staff"]:
                role = "Division Manager"
            else:
                role = "CSR"

            self.stdout.write(
                self.style.SUCCESS(f"Created {role}: {username} ({email})")
            )

            # Assign groups
            for group_name in user_data.get("groups", []):
                try:
                    group = Group.objects.get(name=group_name)
                    user.groups.add(group)
                    self.stdout.write(f"  -> Added to group: {group_name}")
                except Group.DoesNotExist:
                    self.stdout.write(
                        self.style.WARNING(f"  -> Group not found: {group_name}")
                    )

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(f"Done! Created {created_count} new staff users.")
        )
        self.stdout.write("")
        self.stdout.write("Login credentials (all use password123):")
        self.stdout.write("  CSRs:             csr1@speedy.com, csr2@speedy.com, csr3@speedy.com")
        self.stdout.write("  Division Managers: dm1@speedy.com, dm2@speedy.com")
        self.stdout.write("  Network Manager:   nm1@speedy.com")
