"""
Database router for NAGS MySQL database.

Routes all queries for NAGS models to the 'nags' database connection.
NAGS database is read-only - no migrations, creates, or deletes allowed.
"""


class NAGSRouter:
    """
    Routes database operations for NAGS models to the 'nags' database.

    All NAGS models are in vehicles/nags_models.py with app_label='vehicles'
    and are identified by the 'nags_table' attribute.
    """

    # Models that use the NAGS database (identified by their table names)
    NAGS_TABLES = {
        "nags_glass",
        "nags_glass_parts",
        "nags_mouldings",
        "nags_adhesives",
        "nags_misc_parts",
        "nags_labor",
        "nags_vehicle_makes",
        "nags_vehicle_models",
        "nags_vehicle_years",
    }

    def _is_nags_model(self, model):
        """Check if a model belongs to the NAGS database."""
        # Check if model has the nags_db attribute set to True
        if hasattr(model, "_meta"):
            db_table = getattr(model._meta, "db_table", "")
            return db_table in self.NAGS_TABLES or db_table.startswith("nags_")
        return False

    def db_for_read(self, model, **hints):
        """
        Route read operations for NAGS models to 'nags' database.
        """
        if self._is_nags_model(model):
            return "nags"
        return None

    def db_for_write(self, model, **hints):
        """
        Route write operations for NAGS models to 'nags' database.
        Note: NAGS tables are read-only, writes will fail at DB level.
        """
        if self._is_nags_model(model):
            return "nags"
        return None

    def allow_relation(self, obj1, obj2, **hints):
        """
        Allow relations within the same database.
        Disallow relations between NAGS and default database.
        """
        is_nags1 = self._is_nags_model(type(obj1))
        is_nags2 = self._is_nags_model(type(obj2))

        # Allow if both are NAGS or both are non-NAGS
        if is_nags1 == is_nags2:
            return True

        # Disallow cross-database relations
        return False

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """
        Never migrate NAGS models - they are external, read-only tables.
        """
        if db == "nags":
            # Never run migrations on the NAGS database
            return False

        # Check if this is a NAGS model trying to migrate on default
        model = hints.get("model")
        if model and self._is_nags_model(model):
            return False

        # Allow all other migrations on default database
        return None
