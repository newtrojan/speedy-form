"""
Unmanaged Django models for NAGS MySQL database.

These models map to the existing NAGS database tables and are READ-ONLY.
Django will NOT create or manage these tables (managed=False).

Database: 202501_us (January 2025 US Edition)
Connection: Configured in settings as 'nags' database
"""

from django.db import models


class NAGSGlassConfig(models.Model):
    """
    Glass configuration with labor hours and hardware flags.

    Table: dbo.NAGS_GLASS_CFG
    Contains labor hours (NAGS_LABOR) and hardware requirement flags.
    """

    nags_glass_id = models.CharField(
        max_length=7,
        primary_key=True,
        db_column="NAGS_GLASS_ID",
        help_text="NAGS glass part ID",
    )
    mlding_flag = models.CharField(
        max_length=1,
        db_column="MLDING_FLAG",
        blank=True,
        null=True,
        help_text="Moulding required (Y/N)",
    )
    clips_flag = models.CharField(
        max_length=1,
        db_column="CLIPS_FLAG",
        blank=True,
        null=True,
        help_text="Clips required (Y/N)",
    )
    nags_labor = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        db_column="NAGS_LABOR",
        blank=True,
        null=True,
        help_text="Labor hours for installation",
    )
    atchmnt_dsc = models.CharField(
        max_length=255,
        db_column="ATCHMNT_DSC",
        blank=True,
        null=True,
        help_text="Attachment description (e.g., 'TOP & LOWER MOULDING; CAMERA BRACKET')",
    )

    class Meta:
        managed = False
        db_table = "dbo.NAGS_GLASS_CFG"

    def __str__(self):
        return f"{self.nags_glass_id} (labor={self.nags_labor}h)"

    @property
    def moulding_required(self) -> bool:
        """Check if moulding is required."""
        return self.mlding_flag == "Y"

    @property
    def clips_required(self) -> bool:
        """Check if clips are required."""
        return self.clips_flag == "Y"


class NAGSGlass(models.Model):
    """
    Glass part master data.

    Table: dbo.NAGS_GLASS
    Contains glass part specifications (dimensions, features, urethane qty).
    """

    nags_glass_id = models.CharField(
        max_length=7,
        primary_key=True,
        db_column="NAGS_GLASS_ID",
        help_text="NAGS glass part ID (e.g., 'DW04567')",
    )
    prefix_cd = models.CharField(
        max_length=2,
        db_column="PREFIX_CD",
        help_text="Glass category prefix (DW, DT, FW, FT, etc.)",
    )
    part_num = models.IntegerField(
        db_column="PART_NUM",
        help_text="Numeric part number",
    )
    ant_flag = models.CharField(
        max_length=1,
        db_column="ANT_FLAG",
        blank=True,
        null=True,
        help_text="Has antenna (Y/N)",
    )
    blk_size1 = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        db_column="BLK_SIZE1",
        blank=True,
        null=True,
        help_text="Block dimension 1",
    )
    blk_size2 = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        db_column="BLK_SIZE2",
        blank=True,
        null=True,
        help_text="Block dimension 2",
    )
    encap_flag = models.CharField(
        max_length=1,
        db_column="ENCAP_FLAG",
        blank=True,
        null=True,
        help_text="Encapsulated glass (Y/N)",
    )
    hds_up_disp_flag = models.CharField(
        max_length=1,
        db_column="HDS_UP_DISP_FLAG",
        blank=True,
        null=True,
        help_text="Heads-up display (Y/N)",
    )
    heated_flag = models.CharField(
        max_length=1,
        db_column="HEATED_FLAG",
        blank=True,
        null=True,
        help_text="Heated glass (Y/N)",
    )
    num_holes = models.CharField(
        max_length=2,
        db_column="NUM_HOLES",
        blank=True,
        null=True,
        help_text="Number of holes",
    )
    slider_flag = models.CharField(
        max_length=1,
        db_column="SLIDER_FLAG",
        blank=True,
        null=True,
        help_text="Sliding window (Y/N)",
    )
    solar_flag = models.CharField(
        max_length=1,
        db_column="SOLAR_FLAG",
        blank=True,
        null=True,
        help_text="Solar coating (Y/N)",
    )
    superseding_dt = models.CharField(
        max_length=19,
        db_column="SUPERSEDING_DT",
        blank=True,
        null=True,
        help_text="Date this part was superseded",
    )
    superseding_nags_glass_id = models.CharField(
        max_length=7,
        db_column="SUPERSEDING_NAGS_GLASS_ID",
        blank=True,
        null=True,
        help_text="Replacement part ID",
    )
    thickness = models.CharField(
        max_length=4,
        db_column="THICKNESS",
        blank=True,
        null=True,
        help_text="Glass thickness",
    )
    wt = models.CharField(
        max_length=5,
        db_column="WT",
        blank=True,
        null=True,
        help_text="Weight",
    )
    tube_qty = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        db_column="TUBE_QTY",
        blank=True,
        null=True,
        help_text="Urethane tube quantity needed",
    )

    class Meta:
        managed = False
        db_table = "dbo.NAGS_GLASS"

    def __str__(self):
        return f"{self.nags_glass_id} ({self.prefix_cd})"

    @property
    def is_domestic(self) -> bool:
        """Check if this is a domestic glass part."""
        return self.prefix_cd.startswith("D") if self.prefix_cd else False

    @property
    def is_windshield(self) -> bool:
        """Check if this is a windshield."""
        return self.prefix_cd in ("DW", "FW") if self.prefix_cd else False


class NAGSGlassPrice(models.Model):
    """
    Glass pricing by region, color, and attachment.

    Table: dbo.NAGS_GLASS_PRC
    Multiple rows per glass part (different colors, dates, attachments).
    Use most recent EFF_DT with PRC_STATUS_CD = 'A' for current pricing.
    """

    # Composite primary key would be: nags_glass_id + glass_color_cd + region_cd + eff_dt
    # Django doesn't support composite PKs, so we mark nags_glass_id as PK for ORM purposes
    # Note: This isn't truly unique, so avoid .get() - use .filter().first() instead

    nags_glass_id = models.CharField(
        max_length=7,
        db_column="NAGS_GLASS_ID",
        primary_key=True,
        help_text="FK to NAGS_GLASS",
    )
    atchmnt_flag = models.CharField(
        max_length=1,
        db_column="ATCHMNT_FLAG",
        blank=True,
        null=True,
        help_text="Attachment flag (Y/N)",
    )
    glass_color_cd = models.CharField(
        max_length=2,
        db_column="GLASS_COLOR_CD",
        help_text="Color code (GT=Green Tint, etc.)",
    )
    prem_flag = models.CharField(
        max_length=1,
        db_column="PREM_FLAG",
        blank=True,
        null=True,
        help_text="Premium flag (Y/N)",
    )
    region_cd = models.CharField(
        max_length=1,
        db_column="REGION_CD",
        help_text="Region (U=US)",
    )
    eff_dt = models.CharField(
        max_length=19,
        db_column="EFF_DT",
        help_text="Effective date (YYYYMMDD format)",
    )
    avail_cd = models.CharField(
        max_length=1,
        db_column="AVAIL_CD",
        blank=True,
        null=True,
        help_text="Availability code (H=Historical, A=Active)",
    )
    prc = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        db_column="PRC",
        help_text="NAGS LIST PRICE",
    )
    prc_status_cd = models.CharField(
        max_length=3,
        db_column="PRC_STATUS_CD",
        help_text="Price status (NP=No Price, A=Active)",
    )
    spcl_prc_cd = models.CharField(
        max_length=1,
        db_column="SPCL_PRC_CD",
        blank=True,
        null=True,
        help_text="Special price code",
    )

    class Meta:
        managed = False
        db_table = "dbo.NAGS_GLASS_PRC"

    def __str__(self):
        return f"{self.nags_glass_id} - ${self.prc} ({self.glass_color_cd})"

    @property
    def is_active(self) -> bool:
        """Check if this price is currently active."""
        return self.prc_status_cd == "A"


class NAGSGlassDetail(models.Model):
    """
    Glass detail/variants.

    Table: dbo.NAGS_GLASS_DET
    """

    # No true PK in this table - using nags_glass_id for ORM purposes
    nags_glass_id = models.CharField(
        max_length=7,
        db_column="NAGS_GLASS_ID",
        primary_key=True,
    )
    atchmnt_flag = models.CharField(
        max_length=1,
        db_column="ATCHMNT_FLAG",
        blank=True,
        null=True,
    )
    glass_color_cd = models.CharField(
        max_length=2,
        db_column="GLASS_COLOR_CD",
        blank=True,
        null=True,
    )
    prem_flag = models.CharField(
        max_length=1,
        db_column="PREM_FLAG",
        blank=True,
        null=True,
    )

    class Meta:
        managed = False
        db_table = "dbo.NAGS_GLASS_DET"


class NAGSHardware(models.Model):
    """
    Hardware part master data.

    Table: dbo.NAGS_HW
    """

    nags_hw_id = models.CharField(
        max_length=9,
        primary_key=True,
        db_column="NAGS_HW_ID",
        help_text="Hardware part ID (e.g., 'HAH000004')",
    )
    hw_type_cd = models.CharField(
        max_length=2,
        db_column="HW_TYPE_CD",
        help_text="Hardware type code (FK to HW_TYPE)",
    )
    hw_num = models.IntegerField(
        db_column="HW_NUM",
        help_text="Hardware number",
    )
    superseding_dt = models.CharField(
        max_length=19,
        db_column="SUPERSEDING_DT",
        blank=True,
        null=True,
    )
    superseding_hw_id = models.CharField(
        max_length=9,
        db_column="SUPERSEDING_HW_ID",
        blank=True,
        null=True,
    )

    class Meta:
        managed = False
        db_table = "dbo.NAGS_HW"

    def __str__(self):
        return f"{self.nags_hw_id} ({self.hw_type_cd})"


class NAGSHardwarePrice(models.Model):
    """
    Hardware pricing.

    Table: dbo.NAGS_HW_PRC
    """

    # No true PK in this table - using nags_hw_id for ORM purposes
    nags_hw_id = models.CharField(
        max_length=9,
        db_column="NAGS_HW_ID",
        primary_key=True,
    )
    hw_color_cd = models.CharField(
        max_length=2,
        db_column="HW_COLOR_CD",
        help_text="Color code (NA=Not Applicable)",
    )
    region_cd = models.CharField(
        max_length=1,
        db_column="REGION_CD",
    )
    prc = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        db_column="PRC",
        help_text="LIST PRICE",
    )
    eff_dt = models.CharField(
        max_length=19,
        db_column="EFF_DT",
    )
    prc_status_cd = models.CharField(
        max_length=1,
        db_column="PRC_STATUS_CD",
        help_text="Price status (A=Active)",
    )

    class Meta:
        managed = False
        db_table = "dbo.NAGS_HW_PRC"

    def __str__(self):
        return f"{self.nags_hw_id} - ${self.prc}"


class NAGSHardwareType(models.Model):
    """
    Hardware type codes and descriptions.

    Table: dbo.HW_TYPE

    Common types:
    - AH = Adhesive
    - CL = Clip(s)
    - CH = Channel
    - MO = Moulding
    """

    hw_type_cd = models.CharField(
        max_length=2,
        primary_key=True,
        db_column="HW_TYPE_CD",
    )
    dsc = models.CharField(
        max_length=100,
        db_column="DSC",
        help_text="Description",
    )
    usage = models.CharField(
        max_length=1,
        db_column="USAGE",
        blank=True,
        null=True,
        help_text="M=Major part, I=Installation item",
    )

    class Meta:
        managed = False
        db_table = "dbo.HW_TYPE"

    def __str__(self):
        return f"{self.hw_type_cd} - {self.dsc}"


class NAGSVehicleGlass(models.Model):
    """
    Vehicle to glass part mapping.

    Table: dbo.VEH_GLASS
    Maps vehicles to compatible glass parts with optional VIN range filtering.
    """

    # No true PK in this table - using veh_id for ORM purposes
    veh_id = models.IntegerField(
        db_column="VEH_ID",
        primary_key=True,
        help_text="FK to VEH table",
    )
    nags_glass_id = models.CharField(
        max_length=7,
        db_column="NAGS_GLASS_ID",
        help_text="FK to NAGS_GLASS",
    )
    opening_seq = models.SmallIntegerField(
        db_column="OPENING_SEQ",
        help_text="Opening sequence (1=primary, 2+=alternates)",
    )
    additional_nags_labor = models.CharField(
        max_length=3,
        db_column="ADDITIONAL_NAGS_LABOR",
        blank=True,
        null=True,
        help_text="Extra labor hours",
    )
    from_range = models.CharField(
        max_length=12,
        db_column="FROM_RANGE",
        blank=True,
        null=True,
        help_text="VIN range start",
    )
    to_range = models.CharField(
        max_length=12,
        db_column="TO_RANGE",
        blank=True,
        null=True,
        help_text="VIN range end",
    )
    range_type_cd = models.CharField(
        max_length=1,
        db_column="RANGE_TYPE_CD",
        blank=True,
        null=True,
    )

    class Meta:
        managed = False
        db_table = "dbo.VEH_GLASS"

    def __str__(self):
        return f"VEH {self.veh_id} -> {self.nags_glass_id}"


class NAGSVehicle(models.Model):
    """
    Vehicle master data.

    Table: dbo.VEH
    """

    veh_id = models.IntegerField(
        primary_key=True,
        db_column="VEH_ID",
    )
    make_id = models.IntegerField(
        db_column="MAKE_ID",
        blank=True,
        null=True,
    )
    model_id = models.IntegerField(
        db_column="MODEL_ID",
        blank=True,
        null=True,
    )
    year = models.SmallIntegerField(
        db_column="YEAR",
        blank=True,
        null=True,
    )
    body_style_cd = models.CharField(
        max_length=2,
        db_column="BODY_STYLE_CD",
        blank=True,
        null=True,
    )

    class Meta:
        managed = False
        db_table = "dbo.VEH"

    def __str__(self):
        return f"VEH {self.veh_id} ({self.year})"


class NAGSMake(models.Model):
    """
    Vehicle makes.

    Table: dbo.MAKE
    """

    make_id = models.IntegerField(
        primary_key=True,
        db_column="MAKE_ID",
    )
    make_nm = models.CharField(
        max_length=50,
        db_column="MAKE_NM",
        blank=True,
        null=True,
    )

    class Meta:
        managed = False
        db_table = "dbo.MAKE"

    def __str__(self):
        return self.make_nm or f"Make {self.make_id}"


class NAGSMakeModel(models.Model):
    """
    Make-model combinations.

    Table: dbo.MAKE_MODEL
    """

    # No true PK in this table - using model_id for ORM purposes
    make_id = models.IntegerField(
        db_column="MAKE_ID",
    )
    model_id = models.IntegerField(
        db_column="MODEL_ID",
        primary_key=True,
    )
    model_nm = models.CharField(
        max_length=50,
        db_column="MODEL_NM",
        blank=True,
        null=True,
    )

    class Meta:
        managed = False
        db_table = "dbo.MAKE_MODEL"

    def __str__(self):
        return self.model_nm or f"Model {self.model_id}"


class NAGSCategory(models.Model):
    """
    Category codes.

    Table: dbo.CATEGORY

    Key categories:
    - 36 = Glass
    - 25 = Moulding
    - 7 = Comp
    """

    cat_cd = models.IntegerField(
        primary_key=True,
        db_column="CAT_CD",
    )
    dsc = models.CharField(
        max_length=50,
        db_column="DSC",
    )

    class Meta:
        managed = False
        db_table = "dbo.CATEGORY"

    def __str__(self):
        return f"{self.cat_cd} - {self.dsc}"


class NAGSPrefix(models.Model):
    """
    Glass prefix codes.

    Table: dbo.PREFIX

    Key prefixes:
    - DW = Domestic Windshield
    - DT = Domestic Tempered
    - FW = Foreign Windshield
    - FT = Foreign Tempered
    """

    prefix_cd = models.CharField(
        max_length=2,
        primary_key=True,
        db_column="PREFIX_CD",
    )
    dsc = models.CharField(
        max_length=50,
        db_column="DSC",
        blank=True,
        null=True,
    )

    class Meta:
        managed = False
        db_table = "dbo.PREFIX"

    def __str__(self):
        return f"{self.prefix_cd} - {self.dsc}"
