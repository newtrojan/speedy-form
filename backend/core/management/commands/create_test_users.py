from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group

User = get_user_model()


class Command(BaseCommand):
    help = "Creates test users for development"

    def handle(self, *args, **options):
        users: list[dict] = [
            {
                "username": "admin",
                "email": "admin@example.com",
                "password": "admin123",
                "is_staff": True,
                "is_superuser": True,
                "groups": ["Admin"],
            },
            {
                "username": "support1",
                "email": "support1@example.com",
                "password": "support123",
                "is_staff": True,
                "is_superuser": False,
                "groups": ["Support Agent"],
            },
            {
                "username": "customer1",
                "email": "customer1@example.com",
                "password": "customer123",
                "is_staff": False,
                "is_superuser": False,
                "groups": ["Customer"],
            },
        ]

        for user_data in users:
            username: str = user_data["username"]
            if not User.objects.filter(username=username).exists():
                user = User.objects.create_user(
                    username=username,
                    email=user_data["email"],
                    password=user_data["password"],
                    is_staff=user_data["is_staff"],
                    is_superuser=user_data["is_superuser"],
                )
                self.stdout.write(self.style.SUCCESS(f"Created user: {username}"))

                # Assign groups
                for group_name in user_data.get("groups", []):
                    try:
                        group = Group.objects.get(name=group_name)
                        user.groups.add(group)
                        self.stdout.write(f"  Added to group: {group_name}")
                    except Group.DoesNotExist:
                        self.stdout.write(
                            self.style.WARNING(f"  Group not found: {group_name}")
                        )
            else:
                self.stdout.write(f"User exists: {username}")

        self.stdout.write(self.style.SUCCESS("Successfully created test users"))
