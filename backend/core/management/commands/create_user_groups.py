from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission


class Command(BaseCommand):
    help = "Creates default user groups and permissions"

    def handle(self, *args, **options):
        # Define groups
        groups = {
            "Customer": [],
            "Support Agent": [
                # Quote permissions
                "view_quote",
                "change_quote",
                "delete_quote",
                # Customer permissions
                "view_customer",
                "change_customer",
                # Shop permissions
                "view_shop",
            ],
            "Admin": "__all__",  # Special case
        }

        for group_name, permissions in groups.items():
            group, created = Group.objects.get_or_create(name=group_name)
            if created:
                msg = f"Created group: {group_name}"
                self.stdout.write(self.style.SUCCESS(msg))
            else:
                self.stdout.write(f"Group exists: {group_name}")

            if permissions == "__all__":
                # Admin gets all permissions
                # In reality, superusers have all perms, but we can assign all to
                # Admin group too
                pass
            elif permissions:
                for codename in permissions:
                    try:
                        perm = Permission.objects.get(codename=codename)
                        group.permissions.add(perm)
                        self.stdout.write(f"  Added permission: {codename}")
                    except Permission.DoesNotExist:
                        self.stdout.write(
                            self.style.WARNING(f"  Permission not found: {codename}")
                        )

        self.stdout.write(self.style.SUCCESS("Successfully setup user groups"))
