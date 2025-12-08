# NAGS Database Schema Reference

**Database:** `202501_us` (January 2025 US Edition)
**Host:** `construct:3306`
**User:** `root`
**Engine:** MySQL

---

## Cliffnotes - Key Findings

### NHTSA → NAGS Fallback is VIABLE ✅

**Test Case: 2016 Nissan Rogue (VIN: 5N1AT2MV8GC756869)**

1. **NHTSA returns:** Year=2016, Make=NISSAN, Model=Rogue
2. **NAGS lookup chain:**
   - Find MAKE_MODEL_ID: `SELECT MAKE_MODEL_ID FROM dbo.MAKE_MODEL mm JOIN dbo.MAKE m ON mm.MAKE_ID = m.MAKE_ID WHERE m.NAME = 'Nissan' AND mm.NAME = 'Rogue'` → **6186**
   - Find VEH_ID: `SELECT VEH_ID FROM dbo.VEH WHERE MAKE_MODEL_ID = 6186 AND MODEL_YR = 2016` → **66590**
   - Find Glass Parts: `SELECT NAGS_GLASS_ID FROM dbo.VEH_GLASS WHERE VEH_ID = 66590 AND PREFIX_CD IN ('FW','DW')` → **FW03898, FW04077**

3. **AUTOBOLT returned:** FW03898GTYN (same base part! GTYN = Green Tint suffix)
4. **NAGS Price:** $689.35 list (Jan 2025), $655.57 (Sep 2024)

### Glass Features from NAGS (FW03898)
| Field | Value | Meaning |
|-------|-------|---------|
| PREFIX_CD | FW | Foreign Windshield |
| SOLAR_FLAG | Y | Has solar coating |
| HEATED_FLAG | N | Not heated |
| HDS_UP_DISP_FLAG | N | No heads-up display |
| ENCAP_FLAG | N | Not encapsulated |
| ANT_FLAG | N | No antenna |
| TUBE_QTY | 2.0 | 2 tubes urethane needed |

### All Glass Parts for 2016 Rogue (VEH_ID=66590)
| NAGS_GLASS_ID | PREFIX_CD | Type |
|---------------|-----------|------|
| FW03898 | FW | Windshield |
| FW04077 | FW | Windshield (alternate) |
| FB26160 | FB | Back Glass |
| FD26154-FD26157 | FD | Door Glass |
| FQ26158, FQ26159 | FQ | Quarter Glass |
| FR28025 | FR | Right Glass |

### Calibration Data
- **NAGS DB does NOT have calibration info** - this comes from AUTOBOLT only
- Calibration types from AUTOBOLT: None, Static, Dynamic, Dual (Static + Dynamic)

### Labor Hours
- **No dedicated labor table found** in NAGS
- `VEH_GLASS.ADDITIONAL_NAGS_LABOR` field exists but often empty
- Labor likely calculated by shop based on glass type/complexity

### Hardware/Moulding Linking ✅ SOLVED

**Data Flow:**
```
NAGS_GLASS_CFG (flags: MLDING_FLAG, CLIPS_FLAG, NAGS_LABOR)
       │
       ▼
VEH_GLASS_REGION (links VEH_ID + NAGS_GLASS_ID → NAGS_HW_CFG_ID)
       │
       ▼
NAGS_HW_CFG (hardware configuration set)
       │
       ▼
NAGS_HW_CFG_DET (individual hardware items + qty)
       │
       ▼
NAGS_HW (hardware part details)
       │
       ├──► HW_TYPE (filter by type: ML=Moulding, CL=Clip, AH=Adhesive)
       │
       └──► NAGS_HW_PRC (pricing)
```

**Test Case: FW05555 (2024 Toyota Camry)**
- `NAGS_GLASS_CFG.MLDING_FLAG`: N
- `NAGS_GLASS_CFG.CLIPS_FLAG`: Y
- `NAGS_GLASS_CFG.ATCHMNT_DSC`: "TOP & LOWER MOULDING; CAMERA BRACKET"
- `NAGS_GLASS_CFG.NAGS_LABOR`: **3.3 hours** (vs TUBE_QTY=2.0)
- `VEH_GLASS_REGION.NAGS_HW_CFG_ID`: 114516

**Hardware Items Found (Config 114516):**
| Type | Parts | Qty | Price |
|------|-------|-----|-------|
| Adhesive (AH) | HAH000004, HAH000448 | 4.0 | $282.90 |
| Moulding (ML) | 6 parts | 6.0 | $0.00 |
| Clips (CL) | 4 parts | 34.0 | $0.00 |
| Camera (CE) | 2 parts | 2.0 | $0.00 |
| Dam (DA) | 2 parts | 3.0 | $0.00 |
| Mirror (MR) | 1 part | 1.0 | $0.00 |
| Seal (SE), Stop (SO), Weatherstrip (WS) | 4 parts | 4.0 | $0.00 |

**Key Finding:** Adhesive has pricing, moulding parts have $0.00 price in NAGS

---

## Next Steps

1. **Run migration:** `docker-compose exec backend python manage.py migrate`
2. **Implement AUTOBOLT client** with digest auth (replace stub)
3. **Implement NHTSA fallback client** - free VIN decode
4. **Implement NAGS client** with lookup chain:
   - Year/Make/Model → VEH_ID → Glass Parts → Pricing
5. **Quote state for multiple parts:** If AUTOBOLT returns 2+ parts OR NAGS returns multiple → set quote to "pending_validation" for staff selection

---

## Connection Details

```bash
mysql -h construct -P 3306 -u root -p'<password>' 202501_us
```

---

## Key Tables Overview

### Glass Parts & Pricing

| Table | Purpose |
|-------|---------|
| `dbo.NAGS_GLASS` | Glass part master data (part numbers, dimensions, features) |
| `dbo.NAGS_GLASS_PRC` | Glass pricing by region, color, attachment |
| `dbo.NAGS_GLASS_DET` | Glass detail/variants |
| `dbo.VEH_GLASS` | Vehicle-to-glass part mapping |

### Hardware & Kits

| Table | Purpose |
|-------|---------|
| `dbo.NAGS_HW` | Hardware part master data |
| `dbo.NAGS_HW_PRC` | Hardware pricing |
| `dbo.NAGS_HW_KIT` | Kit composition (which parts in a kit) |
| `dbo.HW_TYPE` | Hardware type codes and descriptions |

### Vehicle Data

| Table | Purpose |
|-------|---------|
| `dbo.VEH` | Vehicle master (year/make/model) |
| `dbo.MAKE` | Vehicle makes |
| `dbo.MAKE_MODEL` | Make-model combinations |
| `dbo.BODY_STYLE` | Body style codes |

### Reference Tables

| Table | Purpose |
|-------|---------|
| `dbo.CATEGORY` | Category codes (36=Glass, 25=Moulding, etc.) |
| `dbo.PREFIX` | Glass prefix codes (DW, DT, FW, FT, etc.) |

---

## Table Schemas

### `dbo.NAGS_GLASS` - Glass Parts Master

```sql
DESCRIBE `dbo.NAGS_GLASS`;
```

| Field | Type | Description |
|-------|------|-------------|
| NAGS_GLASS_ID | varchar(7) | Primary key (e.g., "DW04567") |
| PREFIX_CD | varchar(2) | Glass category prefix (DW, DT, FW, FT) |
| PART_NUM | mediumint | Numeric part number |
| ANT_FLAG | varchar(1) | Has antenna (Y/N) |
| BLK_SIZE1 | decimal(4,2) | Block dimension 1 |
| BLK_SIZE2 | decimal(5,2) | Block dimension 2 |
| ENCAP_FLAG | varchar(1) | Encapsulated (Y/N) |
| HDS_UP_DISP_FLAG | varchar(1) | Heads-up display (Y/N) |
| HEATED_FLAG | varchar(1) | Heated glass (Y/N) |
| NUM_HOLES | varchar(2) | Number of holes |
| SLIDER_FLAG | varchar(1) | Sliding window (Y/N) |
| SOLAR_FLAG | varchar(1) | Solar coating (Y/N) |
| SUPERSEDING_DT | varchar(0) | Superseded date |
| SUPERSEDING_NAGS_GLASS_ID | varchar(0) | Replacement part |
| THICKNESS | varchar(4) | Glass thickness |
| WT | varchar(5) | Weight |
| TUBE_QTY | decimal(2,1) | Urethane tube quantity needed |

**Sample Data:**
```
NAGS_GLASS_ID | PREFIX_CD | PART_NUM | ANT_FLAG | BLK_SIZE1 | BLK_SIZE2 | TUBE_QTY
DB00201       | DB        | 201      | Y        | 14.00     | 34.00     | 1.0
DB00375       | DB        | 375      | N        | 16.00     | 46.00     | 1.5
DW04567       | DW        | 4567     | N        | 20.00     | 50.00     | 1.5
```

---

### `dbo.NAGS_GLASS_PRC` - Glass Pricing

```sql
DESCRIBE `dbo.NAGS_GLASS_PRC`;
```

| Field | Type | Description |
|-------|------|-------------|
| NAGS_GLASS_ID | varchar(7) | FK to NAGS_GLASS |
| ATCHMNT_FLAG | varchar(1) | Attachment flag (Y/N) |
| GLASS_COLOR_CD | varchar(2) | Color code (GT=Green Tint, etc.) |
| PREM_FLAG | varchar(1) | Premium flag (Y/N) |
| REGION_CD | varchar(1) | Region (U=US) |
| EFF_DT | varchar(19) | Effective date (YYYYMMDD) |
| AVAIL_CD | varchar(1) | Availability code (H=Historical, A=Active) |
| PRC | decimal(6,2) | **LIST PRICE** |
| PRC_STATUS_CD | varchar(3) | Price status (NP=No Price, A=Active) |
| SPCL_PRC_CD | varchar(1) | Special price code |

**Sample Data:**
```
NAGS_GLASS_ID | GLASS_COLOR_CD | REGION_CD | EFF_DT   | PRC    | PRC_STATUS_CD
DB00201       | GT             | U         | 20050228 | 0.00   | NP
FW04567       | GT             | U         | 20240115 | 485.00 | A
```

**Notes:**
- Multiple rows per NAGS_GLASS_ID (different colors, dates, attachments)
- Use most recent `EFF_DT` with `PRC_STATUS_CD = 'A'` for current pricing
- `PRC` is the NAGS LIST PRICE (apply discount to get cost)

---

### `dbo.NAGS_GLASS_DET` - Glass Details

```sql
DESCRIBE `dbo.NAGS_GLASS_DET`;
```

| Field | Type | Description |
|-------|------|-------------|
| NAGS_GLASS_ID | varchar(7) | FK to NAGS_GLASS |
| ATCHMNT_FLAG | varchar(1) | Attachment flag |
| GLASS_COLOR_CD | varchar(2) | Color code |
| PREM_FLAG | varchar(1) | Premium flag |

---

### `dbo.VEH_GLASS` - Vehicle to Glass Mapping

```sql
DESCRIBE `dbo.VEH_GLASS`;
```

| Field | Type | Description |
|-------|------|-------------|
| VEH_ID | mediumint | FK to VEH table |
| NAGS_GLASS_ID | varchar(7) | FK to NAGS_GLASS |
| OPENING_SEQ | tinyint | Opening sequence (1=primary, 2+=alternates) |
| ADDITIONAL_NAGS_LABOR | varchar(3) | Extra labor hours |
| FROM_RANGE | varchar(12) | VIN range start |
| TO_RANGE | varchar(12) | VIN range end |
| RANGE_TYPE_CD | varchar(1) | Range type code |

---

### `dbo.CATEGORY` - Category Codes

```sql
SELECT * FROM `dbo.CATEGORY`;
```

| CAT_CD | DSC |
|--------|-----|
| 36 | Glass |
| 25 | Moulding |
| 7 | Comp |
| 17 | Heated |
| 34 | Wiper |
| 5 | Bracket |
| 6 | Brake Light |
| 23 | Mirror |
| 15 | Frame |
| 22 | Lock |
| 19 | Holes |
| 21 | Location |
| 37 | Side |
| 38 | Area |
| 41 | Color |

---

### `dbo.NAGS_HW` - Hardware Parts

```sql
DESCRIBE `dbo.NAGS_HW`;
```

| Field | Type | Description |
|-------|------|-------------|
| NAGS_HW_ID | varchar(9) | Primary key (e.g., "HAH000004") |
| HW_TYPE_CD | varchar(2) | FK to HW_TYPE |
| HW_NUM | mediumint | Hardware number |
| SUPERSEDING_DT | varchar(19) | Superseded date |
| SUPERSEDING_HW_ID | varchar(9) | Replacement part |

**Sample Data:**
```
NAGS_HW_ID  | HW_TYPE_CD | HW_NUM
HAC000099   | AC         | 99      (Actuator #99)
HAH000004   | AH         | 4       (Adhesive #4)
HCL000123   | CL         | 123     (Clip #123)
```

---

### `dbo.NAGS_HW_PRC` - Hardware Pricing

```sql
DESCRIBE `dbo.NAGS_HW_PRC`;
```

| Field | Type | Description |
|-------|------|-------------|
| NAGS_HW_ID | varchar(9) | FK to NAGS_HW |
| HW_COLOR_CD | varchar(2) | Color code (NA=Not Applicable) |
| REGION_CD | varchar(1) | Region (U=US) |
| PRC | decimal(4,2) | **LIST PRICE** |
| EFF_DT | varchar(19) | Effective date |
| PRC_STATUS_CD | varchar(1) | Price status (A=Active) |

**Sample Data:**
```
NAGS_HW_ID  | HW_COLOR_CD | REGION_CD | PRC   | EFF_DT   | PRC_STATUS_CD
HAH000004   | NA          | U         | 28.00 | 19960325 | A
HAH000448   | NA          | U         | 48.00 | 19960325 | A
HAH000456   | NA          | U         | 90.00 | 19970501 | A
```

---

### `dbo.HW_TYPE` - Hardware Type Codes

```sql
SELECT * FROM `dbo.HW_TYPE` LIMIT 30;
```

| HW_TYPE_CD | DSC | USAGE |
|------------|-----|-------|
| AC | Actuator | M |
| AE | Adapter | M |
| **AH** | **Adhesive** | **I** |
| AJ | Adjuster | M |
| AN | Antenna | M |
| AP | Applique | M |
| AR | Arm | M |
| BA | Bar | M |
| BB | Blade | M |
| BC | Breaker | M |
| BD | Beading Package | M |
| BI | Bearing | M |
| BM | Bumper | M |
| **BO** | **Bolt** | **I** |
| BR | Bracket | M |
| BS | Base | I |
| BT | Boot | M |
| BU | Bushing | M |
| BZ | Bezel | I |
| CA | Cable | M |
| CB | Carrier | M |
| CC | Collar | I |
| CD | Compass | M |
| CE | Camera | M |
| **CH** | **Channel** | **I** |
| **CI** | **Chip** | **I** |
| **CL** | **Clip(S)** | **I** |
| CM | Cam | M |
| **CN** | **Connector** | **I** |
| CO | Control | M |

**USAGE Codes:**
- `M` = Major part (tracked individually)
- `I` = Installation item (consumable, often in kits)

---

### `dbo.NAGS_HW_KIT` - Kit Composition

```sql
DESCRIBE `dbo.NAGS_HW_KIT`;
```

| Field | Type | Description |
|-------|------|-------------|
| KIT_NAGS_HW_ID | varchar | Kit part ID |
| KIT_HW_COLOR_CD | varchar | Kit color |
| NAGS_HW_ID | varchar | Component part ID |
| HW_COLOR_CD | varchar | Component color |
| QTY | varchar | Quantity in kit |

**Note:** Table appears empty in current database.

---

## Glass Prefix Codes (PREFIX_CD)

Found in `dbo.NAGS_GLASS`:

| Prefix | Category | Description |
|--------|----------|-------------|
| **DW** | Domestic Windshield | US-made windshields |
| **DT** | Domestic Tempered | US-made tempered (side/back) |
| **FW** | Foreign Windshield | Import windshields |
| **FT** | Foreign Tempered | Import tempered (side/back) |
| DB | Domestic Back | Domestic back glass |
| DD | Domestic Door | Domestic door glass |
| DL | Domestic Left | Domestic left glass |
| DP | Domestic Premium | Premium domestic |
| DQ | Domestic Quarter | Quarter panel glass |
| DR | Domestic Right | Right side glass |
| DS | Domestic Slider | Sliding glass |
| DV | Domestic Vent | Vent glass |
| DY | Domestic | Other domestic |
| FB | Foreign Back | Import back glass |
| FD | Foreign Door | Import door glass |
| FL | Foreign Left | Import left glass |
| FP | Foreign Premium | Premium import |
| FQ | Foreign Quarter | Import quarter glass |
| FR | Foreign Right | Import right glass |
| FS | Foreign Slider | Import sliding glass |
| FV | Foreign Vent | Import vent glass |

---

## Pricing Formula

### List-Less Methodology

Auto glass industry standard - prices are calculated as discount FROM list price:

```
Shop Cost = NAGS List Price × (1 - Category Discount%)

Example:
  NAGS List: $500.00
  DW Discount: 65%
  Shop Cost: $500 × (1 - 0.65) = $175.00
```

### Typical Category Discounts

| Category | Typical Discount | Description |
|----------|------------------|-------------|
| DW | 65-70% | Domestic windshields |
| DT | 60-65% | Domestic tempered |
| FW | 55-60% | Foreign windshields |
| FT | 50-55% | Foreign tempered |
| OEM | 10-20% | Original equipment |

---

## Querying Tips

### Get Current Price for a Part

```sql
SELECT
    g.NAGS_GLASS_ID,
    g.PREFIX_CD,
    p.PRC as list_price,
    p.GLASS_COLOR_CD,
    p.EFF_DT
FROM `dbo.NAGS_GLASS` g
JOIN `dbo.NAGS_GLASS_PRC` p ON g.NAGS_GLASS_ID = p.NAGS_GLASS_ID
WHERE g.NAGS_GLASS_ID = 'FW04567'
  AND p.PRC_STATUS_CD = 'A'
  AND p.REGION_CD = 'U'
ORDER BY p.EFF_DT DESC
LIMIT 1;
```

### Get Parts for a Vehicle

```sql
SELECT
    vg.VEH_ID,
    vg.NAGS_GLASS_ID,
    g.PREFIX_CD,
    vg.OPENING_SEQ,
    vg.ADDITIONAL_NAGS_LABOR
FROM `dbo.VEH_GLASS` vg
JOIN `dbo.NAGS_GLASS` g ON vg.NAGS_GLASS_ID = g.NAGS_GLASS_ID
WHERE vg.VEH_ID = 12345
ORDER BY vg.OPENING_SEQ;
```

### Get Hardware Price

```sql
SELECT
    h.NAGS_HW_ID,
    ht.DSC as hw_type,
    p.PRC as list_price
FROM `dbo.NAGS_HW` h
JOIN `dbo.HW_TYPE` ht ON h.HW_TYPE_CD = ht.HW_TYPE_CD
JOIN `dbo.NAGS_HW_PRC` p ON h.NAGS_HW_ID = p.NAGS_HW_ID
WHERE h.NAGS_HW_ID = 'HAH000004'
  AND p.PRC_STATUS_CD = 'A'
ORDER BY p.EFF_DT DESC
LIMIT 1;
```

---

## Django Unmanaged Models

These models should be created in `vehicles/nags_models.py` with `managed = False`:

```python
class NAGSGlass(models.Model):
    nags_glass_id = models.CharField(max_length=7, primary_key=True, db_column='NAGS_GLASS_ID')
    prefix_cd = models.CharField(max_length=2, db_column='PREFIX_CD')
    part_num = models.IntegerField(db_column='PART_NUM')
    tube_qty = models.DecimalField(max_digits=2, decimal_places=1, db_column='TUBE_QTY')
    # ... other fields

    class Meta:
        managed = False
        db_table = 'dbo.NAGS_GLASS'


class NAGSGlassPrice(models.Model):
    nags_glass_id = models.CharField(max_length=7, db_column='NAGS_GLASS_ID')
    glass_color_cd = models.CharField(max_length=2, db_column='GLASS_COLOR_CD')
    region_cd = models.CharField(max_length=1, db_column='REGION_CD')
    prc = models.DecimalField(max_digits=6, decimal_places=2, db_column='PRC')
    eff_dt = models.CharField(max_length=19, db_column='EFF_DT')
    prc_status_cd = models.CharField(max_length=3, db_column='PRC_STATUS_CD')

    class Meta:
        managed = False
        db_table = 'dbo.NAGS_GLASS_PRC'
```

---

## Notes

1. **Table Naming**: All tables use `dbo.` prefix (SQL Server convention migrated to MySQL)
2. **No Labor Table**: Labor hours not found in dedicated table - may be in VEH_GLASS.ADDITIONAL_NAGS_LABOR or calculated
3. **Date Format**: Dates stored as VARCHAR in YYYYMMDD format
4. **Empty Tables**: Some tables like NAGS_HW_KIT appear empty
5. **Lowercase Tables**: Database has both `dbo.NAGS_GLASS_PRC` and `nags_glass_prc` - lowercase may be views or copies
