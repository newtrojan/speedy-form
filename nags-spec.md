# NAGS Glass Lookup API Specification

> **Purpose**: RESTful API to query NAGS database for auto glass parts, pricing, labor, and hardware requirements.

---

## Table of Contents

1. [API Overview](#api-overview)
2. [Endpoints](#endpoints)
3. [Input Parameters](#input-parameters)
4. [Output Schema](#output-schema)
5. [Example Requests & Responses](#example-requests--responses)
6. [Error Handling](#error-handling)
7. [Implementation Guide](#implementation-guide)

---

## API Overview

### Base URL

```
https://api.yourdomain.com/v1
```

### Authentication

```
Authorization: Bearer <api_key>
```

### Core Endpoints

| Method | Endpoint                             | Description                                           |
| ------ | ------------------------------------ | ----------------------------------------------------- |
| POST   | `/glass/lookup`                      | Main lookup - returns glass options with full details |
| GET    | `/vehicles/decode/{vin}`             | Decode VIN to Year/Make/Model/Trim                    |
| GET    | `/vehicles/makes`                    | List all makes                                        |
| GET    | `/vehicles/models/{makeId}`          | List models for a make                                |
| GET    | `/vehicles/years/{makeId}/{modelId}` | List years for make/model                             |
| GET    | `/glass/{nagsGlassId}`               | Get details for specific NAGS part                    |
| GET    | `/hardware/{nagsHwCfgId}`            | Get hardware configuration details                    |

---

## Endpoints

### 1. Glass Lookup (Primary Endpoint)

```
POST /v1/glass/lookup
```

This is your main endpoint - give it vehicle info + position, get back everything needed for quoting.

#### Request Body

```json
{
  "vin": "1HGCV1F34NA012345",
  "position": "windshield",
  "region": "US",
  "includeHardware": true,
  "includeQualifiers": true
}
```

**OR** (without VIN):

```json
{
  "year": 2023,
  "make": "Honda",
  "model": "Accord",
  "trim": "Touring",
  "bodyStyle": "4 Door Sedan",
  "position": "windshield",
  "region": "US",
  "includeHardware": true,
  "includeQualifiers": true
}
```

---

### 2. VIN Decode

```
GET /v1/vehicles/decode/{vin}
```

Decodes VIN and returns vehicle details. Useful for populating dropdowns or confirming vehicle.

---

### 3. Vehicle Dropdowns

```
GET /v1/vehicles/makes
GET /v1/vehicles/models?makeId={makeId}
GET /v1/vehicles/years?makeId={makeId}&modelId={modelId}
GET /v1/vehicles/trims?makeId={makeId}&modelId={modelId}&year={year}
GET /v1/vehicles/bodyStyles?makeId={makeId}&modelId={modelId}&year={year}
```

For manual vehicle selection UI.

---

## Input Parameters

### Glass Lookup Input

| Field               | Type    | Required | Description                            |
| ------------------- | ------- | -------- | -------------------------------------- |
| `vin`               | string  | No\*     | 17-character VIN                       |
| `year`              | integer | No\*     | Model year (e.g., 2023)                |
| `make`              | string  | No\*     | Make name (e.g., "Honda")              |
| `model`             | string  | No\*     | Model name (e.g., "Accord")            |
| `trim`              | string  | No       | Trim level (e.g., "Touring")           |
| `bodyStyle`         | string  | No       | Body style (e.g., "4 Door Sedan")      |
| `position`          | string  | Yes      | Glass position (see below)             |
| `region`            | string  | No       | Region code (default: "US")            |
| `includeHardware`   | boolean | No       | Include moulding/clips (default: true) |
| `includeQualifiers` | boolean | No       | Include ADAS notes (default: true)     |

\*Either `vin` OR (`year` + `make` + `model`) is required.

### Position Values

| Value              | Description           | NAGS Prefix |
| ------------------ | --------------------- | ----------- |
| `windshield`       | Front windshield      | FW, DW      |
| `backglass`        | Rear window           | BG          |
| `door_front_left`  | Front left door       | FD (Left)   |
| `door_front_right` | Front right door      | FD (Right)  |
| `door_rear_left`   | Rear left door        | RD (Left)   |
| `door_rear_right`  | Rear right door       | RD (Right)  |
| `quarter_left`     | Left quarter glass    | QG (Left)   |
| `quarter_right`    | Right quarter glass   | QG (Right)  |
| `vent_left`        | Left vent glass       | VG (Left)   |
| `vent_right`       | Right vent glass      | VG (Right)  |
| `sunroof`          | Sunroof/moonroof      | RF          |
| `all`              | All glass for vehicle | \*          |

### Region Values

| Value | Description             |
| ----- | ----------------------- |
| `US`  | United States (default) |
| `CA`  | Canada                  |
| `MX`  | Mexico                  |

---

## Output Schema

### Glass Lookup Response

```json
{
  "success": true,
  "requestId": "req_abc123",
  "timestamp": "2025-01-07T14:30:00Z",

  "vehicle": {
    "vin": "1HGCV1F34NA012345",
    "year": 2023,
    "make": "Honda",
    "makeId": 101,
    "model": "Accord",
    "modelId": 2045,
    "trim": "Touring",
    "bodyStyle": "4 Door Sedan",
    "bodyStyleId": 12,
    "vehId": 458923,
    "country": "USA",
    "isDomestic": true
  },

  "position": {
    "requested": "windshield",
    "prefixCodes": ["FW", "DW"],
    "description": "Front Windshield"
  },

  "glassOptions": [
    {
      "nagsGlassId": "DW02568",
      "prefixCd": "DW",
      "partNumber": 2568,
      "partType": "Windshield",
      "description": "Windshield - Standard",

      "features": {
        "heated": false,
        "heatedFlag": "N",
        "hud": false,
        "hudFlag": "N",
        "antenna": false,
        "antennaFlag": "N",
        "solar": false,
        "solarFlag": "N",
        "encapsulated": false,
        "encapsulatedFlag": "N",
        "acoustic": false,
        "slider": false,
        "rainSensor": false
      },

      "specifications": {
        "thickness": "4.8",
        "weight": "25.5",
        "blockSize1": 48.0,
        "blockSize2": 28.5,
        "numHoles": "2"
      },

      "pricing": {
        "listPrice": 285.0,
        "glassColorCd": "GN",
        "glassColor": "Green Tint",
        "effectiveDate": "2025-01-01",
        "priceStatusCd": "ACT",
        "premiumFlag": "N",
        "region": "US"
      },

      "labor": {
        "baseHours": 1.5,
        "additionalHours": 0.0,
        "totalHours": 1.5
      },

      "attachments": {
        "mouldingRequired": true,
        "mouldingFlag": "Y",
        "clipsRequired": true,
        "clipsFlag": "Y",
        "attachmentFlag": "Y",
        "attachmentDescription": "Adhesive mounted with clips"
      },

      "hardware": {
        "configId": 12458,
        "configDescription": "Standard mounting kit",
        "items": [
          {
            "nagsHwId": "MC001234",
            "hwType": "Moulding",
            "hwTypeCd": "MC",
            "description": "Windshield Moulding",
            "quantity": 1,
            "unitPrice": 45.0,
            "totalPrice": 45.0,
            "color": "Black",
            "colorCd": "BK"
          },
          {
            "nagsHwId": "CL005678",
            "hwType": "Clip",
            "hwTypeCd": "CL",
            "description": "Retainer Clip",
            "quantity": 8,
            "unitPrice": 1.5,
            "totalPrice": 12.0,
            "color": "Black",
            "colorCd": "BK"
          }
        ],
        "totalHardwareCost": 57.0
      },

      "qualifiers": [],

      "tier": "economy",
      "isOemMatch": false,
      "availability": "in_stock",
      "leadTime": "1-2 days"
    },

    {
      "nagsGlassId": "DW02569",
      "prefixCd": "DW",
      "partNumber": 2569,
      "partType": "Windshield",
      "description": "Windshield - Heated w/ Antenna",

      "features": {
        "heated": true,
        "heatedFlag": "Y",
        "hud": false,
        "hudFlag": "N",
        "antenna": true,
        "antennaFlag": "Y",
        "solar": false,
        "solarFlag": "N",
        "encapsulated": false,
        "encapsulatedFlag": "N",
        "acoustic": false,
        "slider": false,
        "rainSensor": true
      },

      "specifications": {
        "thickness": "5.2",
        "weight": "27.0",
        "blockSize1": 48.0,
        "blockSize2": 28.5,
        "numHoles": "4"
      },

      "pricing": {
        "listPrice": 425.0,
        "glassColorCd": "GN",
        "glassColor": "Green Tint",
        "effectiveDate": "2025-01-01",
        "priceStatusCd": "ACT",
        "premiumFlag": "N",
        "region": "US"
      },

      "labor": {
        "baseHours": 1.5,
        "additionalHours": 0.5,
        "totalHours": 2.0
      },

      "attachments": {
        "mouldingRequired": true,
        "mouldingFlag": "Y",
        "clipsRequired": true,
        "clipsFlag": "Y",
        "attachmentFlag": "Y",
        "attachmentDescription": "Adhesive mounted with clips"
      },

      "hardware": {
        "configId": 12459,
        "configDescription": "Heated glass mounting kit",
        "items": [
          {
            "nagsHwId": "MC001234",
            "hwType": "Moulding",
            "hwTypeCd": "MC",
            "description": "Windshield Moulding",
            "quantity": 1,
            "unitPrice": 48.0,
            "totalPrice": 48.0,
            "color": "Black",
            "colorCd": "BK"
          },
          {
            "nagsHwId": "CL005678",
            "hwType": "Clip",
            "hwTypeCd": "CL",
            "description": "Retainer Clip",
            "quantity": 10,
            "unitPrice": 1.5,
            "totalPrice": 15.0,
            "color": "Black",
            "colorCd": "BK"
          },
          {
            "nagsHwId": "CN009012",
            "hwType": "Connector",
            "hwTypeCd": "CN",
            "description": "Antenna Connector",
            "quantity": 1,
            "unitPrice": 12.0,
            "totalPrice": 12.0,
            "color": null,
            "colorCd": null
          }
        ],
        "totalHardwareCost": 75.0
      },

      "qualifiers": [
        {
          "qualCd": 245,
          "category": "Installation",
          "description": "Requires antenna connector reconnection"
        }
      ],

      "tier": "standard",
      "isOemMatch": false,
      "availability": "in_stock",
      "leadTime": "1-2 days"
    },

    {
      "nagsGlassId": "DW02570",
      "prefixCd": "DW",
      "partNumber": 2570,
      "partType": "Windshield",
      "description": "Windshield - Heated w/ HUD + Antenna",

      "features": {
        "heated": true,
        "heatedFlag": "Y",
        "hud": true,
        "hudFlag": "Y",
        "antenna": true,
        "antennaFlag": "Y",
        "solar": true,
        "solarFlag": "Y",
        "encapsulated": true,
        "encapsulatedFlag": "Y",
        "acoustic": true,
        "slider": false,
        "rainSensor": true
      },

      "specifications": {
        "thickness": "5.8",
        "weight": "32.0",
        "blockSize1": 48.0,
        "blockSize2": 28.5,
        "numHoles": "6"
      },

      "pricing": {
        "listPrice": 895.0,
        "glassColorCd": "GN",
        "glassColor": "Green Tint",
        "effectiveDate": "2025-01-01",
        "priceStatusCd": "ACT",
        "premiumFlag": "Y",
        "region": "US"
      },

      "labor": {
        "baseHours": 2.0,
        "additionalHours": 0.5,
        "totalHours": 2.5
      },

      "attachments": {
        "mouldingRequired": true,
        "mouldingFlag": "Y",
        "clipsRequired": true,
        "clipsFlag": "Y",
        "attachmentFlag": "Y",
        "attachmentDescription": "Encapsulated with integrated moulding"
      },

      "hardware": {
        "configId": 12460,
        "configDescription": "Premium HUD glass mounting kit",
        "items": [
          {
            "nagsHwId": "MC001235",
            "hwType": "Moulding",
            "hwTypeCd": "MC",
            "description": "Premium Windshield Moulding",
            "quantity": 1,
            "unitPrice": 65.0,
            "totalPrice": 65.0,
            "color": "Black",
            "colorCd": "BK"
          },
          {
            "nagsHwId": "CL005679",
            "hwType": "Clip",
            "hwTypeCd": "CL",
            "description": "Retainer Clip - Premium",
            "quantity": 12,
            "unitPrice": 2.0,
            "totalPrice": 24.0,
            "color": "Black",
            "colorCd": "BK"
          },
          {
            "nagsHwId": "CN009012",
            "hwType": "Connector",
            "hwTypeCd": "CN",
            "description": "Antenna Connector",
            "quantity": 1,
            "unitPrice": 12.0,
            "totalPrice": 12.0,
            "color": null,
            "colorCd": null
          }
        ],
        "totalHardwareCost": 101.0
      },

      "qualifiers": [
        {
          "qualCd": 245,
          "category": "Installation",
          "description": "Requires antenna connector reconnection"
        },
        {
          "qualCd": 512,
          "category": "ADAS",
          "description": "ADAS camera recalibration required after installation"
        },
        {
          "qualCd": 513,
          "category": "ADAS",
          "description": "HUD alignment may be required"
        }
      ],

      "tier": "premium",
      "isOemMatch": true,
      "availability": "special_order",
      "leadTime": "3-5 days"
    }
  ],

  "adas": {
    "vehicleHasAdas": true,
    "calibrationRequired": true,
    "calibrationType": "static",
    "calibrationNotes": [
      "Vehicle equipped with Forward Collision Warning",
      "Vehicle equipped with Lane Departure Warning",
      "Touring trim typically includes full ADAS suite",
      "Static calibration required after windshield replacement"
    ],
    "adasFeatures": [
      "Forward Collision Warning",
      "Lane Departure Warning",
      "Lane Keep Assist",
      "Adaptive Cruise Control"
    ]
  },

  "summary": {
    "totalOptions": 3,
    "priceRange": {
      "low": 285.0,
      "high": 895.0
    },
    "recommendedOption": "DW02570",
    "recommendedReason": "Matches vehicle trim (Touring) with all OEM features"
  }
}
```

---

## Field Definitions

### Vehicle Object

| Field         | Type    | Description                    |
| ------------- | ------- | ------------------------------ |
| `vin`         | string  | Original VIN input             |
| `year`        | integer | Model year                     |
| `make`        | string  | Make name                      |
| `makeId`      | integer | NAGS MAKE_ID                   |
| `model`       | string  | Model name                     |
| `modelId`     | integer | NAGS MAKE_MODEL_ID             |
| `trim`        | string  | Trim level (from VIN or input) |
| `bodyStyle`   | string  | Body style description         |
| `bodyStyleId` | integer | NAGS BODY_STYLE_ID             |
| `vehId`       | integer | NAGS VEH_ID (internal use)     |
| `country`     | string  | Manufacturing country          |
| `isDomestic`  | boolean | true if USA/Canada/Mexico      |

### Glass Option Object

| Field            | Type    | Description                             |
| ---------------- | ------- | --------------------------------------- |
| `nagsGlassId`    | string  | NAGS part number (e.g., "DW02568")      |
| `prefixCd`       | string  | Part type code (e.g., "DW")             |
| `partNumber`     | integer | Numeric part number                     |
| `partType`       | string  | Part type description                   |
| `description`    | string  | Full part description                   |
| `features`       | object  | Feature flags (see below)               |
| `specifications` | object  | Physical specs (see below)              |
| `pricing`        | object  | Price info (see below)                  |
| `labor`          | object  | Labor hours (see below)                 |
| `attachments`    | object  | Moulding/clips flags (see below)        |
| `hardware`       | object  | Hardware items with pricing             |
| `qualifiers`     | array   | ADAS/installation notes                 |
| `tier`           | string  | economy / standard / premium            |
| `isOemMatch`     | boolean | true if matches vehicle trim            |
| `availability`   | string  | in_stock / special_order / discontinued |
| `leadTime`       | string  | Estimated delivery time                 |

### Features Object

| Field          | Type    | Source Column          |
| -------------- | ------- | ---------------------- |
| `heated`       | boolean | HEATED_FLAG = 'Y'      |
| `hud`          | boolean | HDS_UP_DISP_FLAG = 'Y' |
| `antenna`      | boolean | ANT_FLAG = 'Y'         |
| `solar`        | boolean | SOLAR_FLAG = 'Y'       |
| `encapsulated` | boolean | ENCAP_FLAG = 'Y'       |
| `acoustic`     | boolean | From QUAL table        |
| `slider`       | boolean | SLIDER_FLAG = 'Y'      |
| `rainSensor`   | boolean | From QUAL table        |

### Specifications Object

| Field        | Type    | Source Column |
| ------------ | ------- | ------------- |
| `thickness`  | string  | THICKNESS     |
| `weight`     | string  | WT            |
| `blockSize1` | decimal | BLK_SIZE1     |
| `blockSize2` | decimal | BLK_SIZE2     |
| `numHoles`   | string  | NUM_HOLES     |

### Pricing Object

| Field           | Type    | Source             |
| --------------- | ------- | ------------------ |
| `listPrice`     | decimal | NAGS_GLASS_PRC.PRC |
| `glassColorCd`  | string  | GLASS_COLOR_CD     |
| `glassColor`    | string  | GLASS_COLOR.DSC    |
| `effectiveDate` | string  | EFF_DT             |
| `priceStatusCd` | string  | PRC_STATUS_CD      |
| `premiumFlag`   | string  | PREM_FLAG          |
| `region`        | string  | REGION_CD          |

### Labor Object

| Field             | Type    | Source                          |
| ----------------- | ------- | ------------------------------- |
| `baseHours`       | decimal | NAGS_GLASS_CFG.NAGS_LABOR       |
| `additionalHours` | decimal | VEH_GLASS.ADDITIONAL_NAGS_LABOR |
| `totalHours`      | decimal | Sum of above                    |

### Attachments Object

| Field                   | Type    | Source            |
| ----------------------- | ------- | ----------------- |
| `mouldingRequired`      | boolean | MLDING_FLAG = 'Y' |
| `clipsRequired`         | boolean | CLIPS_FLAG = 'Y'  |
| `attachmentFlag`        | string  | ATCHMNT_FLAG      |
| `attachmentDescription` | string  | ATCHMNT_DSC       |

### Hardware Object

| Field               | Type    | Description            |
| ------------------- | ------- | ---------------------- |
| `configId`          | integer | NAGS_HW_CFG_ID         |
| `configDescription` | string  | NAGS_HW_CFG.DSC        |
| `items`             | array   | List of hardware items |
| `totalHardwareCost` | decimal | Sum of all item costs  |

### Hardware Item Object

| Field         | Type    | Source              |
| ------------- | ------- | ------------------- |
| `nagsHwId`    | string  | NAGS_HW_ID          |
| `hwType`      | string  | HW_TYPE.DSC         |
| `hwTypeCd`    | string  | HW_TYPE_CD          |
| `description` | string  | Derived description |
| `quantity`    | decimal | NAGS_HW_CFG_DET.QTY |
| `unitPrice`   | decimal | NAGS_HW_PRC.PRC     |
| `totalPrice`  | decimal | QTY × PRC           |
| `color`       | string  | HW_COLOR.DSC        |
| `colorCd`     | string  | HW_COLOR_CD         |

### ADAS Object

| Field                 | Type    | Description                      |
| --------------------- | ------- | -------------------------------- |
| `vehicleHasAdas`      | boolean | Vehicle has any ADAS features    |
| `calibrationRequired` | boolean | Calibration needed after install |
| `calibrationType`     | string  | static / dynamic / dual          |
| `calibrationNotes`    | array   | Human-readable notes             |
| `adasFeatures`        | array   | List of detected ADAS features   |

---

## Example Requests & Responses

### Example 1: VIN Lookup for Windshield

**Request:**

```bash
curl -X POST https://api.example.com/v1/glass/lookup \
  -H "Authorization: Bearer sk_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "vin": "1HGCV1F34NA012345",
    "position": "windshield",
    "region": "US"
  }'
```

**Response:** (See full response schema above)

---

### Example 2: Manual Vehicle Entry

**Request:**

```bash
curl -X POST https://api.example.com/v1/glass/lookup \
  -H "Authorization: Bearer sk_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "year": 2023,
    "make": "Honda",
    "model": "Accord",
    "position": "door_front_left",
    "region": "US"
  }'
```

---

### Example 3: VIN Decode Only

**Request:**

```bash
curl -X GET https://api.example.com/v1/vehicles/decode/1HGCV1F34NA012345 \
  -H "Authorization: Bearer sk_live_xxx"
```

**Response:**

```json
{
  "success": true,
  "vehicle": {
    "vin": "1HGCV1F34NA012345",
    "year": 2023,
    "make": "Honda",
    "makeId": 101,
    "model": "Accord",
    "modelId": 2045,
    "trim": "Touring",
    "bodyStyle": "4 Door Sedan",
    "bodyStyleId": 12,
    "driveType": "FWD",
    "engineType": "1.5L Turbo",
    "country": "USA",
    "isDomestic": true,
    "adas": {
      "forwardCollisionWarning": true,
      "laneDepartureWarning": true,
      "adaptiveCruiseControl": true,
      "blindSpotWarning": true
    }
  }
}
```

---

### Example 4: Get Specific Part Details

**Request:**

```bash
curl -X GET https://api.example.com/v1/glass/DW02570 \
  -H "Authorization: Bearer sk_live_xxx"
```

**Response:**

```json
{
  "success": true,
  "glass": {
    "nagsGlassId": "DW02570",
    "prefixCd": "DW",
    "partNumber": 2570,
    "partType": "Windshield",
    "features": {
      "heated": true,
      "hud": true,
      "antenna": true,
      "solar": true,
      "encapsulated": true
    },
    "specifications": {
      "thickness": "5.8",
      "weight": "32.0"
    },
    "pricing": {
      "US": 895.0,
      "CA": 945.0,
      "MX": 820.0
    },
    "labor": {
      "baseHours": 2.0
    },
    "compatibleVehicles": [
      {
        "year": 2023,
        "make": "Honda",
        "model": "Accord",
        "trims": ["Touring", "Hybrid Touring"]
      },
      {
        "year": 2022,
        "make": "Honda",
        "model": "Accord",
        "trims": ["Touring", "Hybrid Touring"]
      }
    ]
  }
}
```

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "INVALID_VIN",
    "message": "The provided VIN is invalid or malformed",
    "details": "VIN check digit validation failed"
  },
  "requestId": "req_abc123"
}
```

### Error Codes

| Code                     | HTTP Status | Description                         |
| ------------------------ | ----------- | ----------------------------------- |
| `INVALID_VIN`            | 400         | VIN format or check digit invalid   |
| `VIN_DECODE_FAILED`      | 400         | Could not decode VIN                |
| `VEHICLE_NOT_FOUND`      | 404         | No matching vehicle in NAGS         |
| `GLASS_NOT_FOUND`        | 404         | No glass found for vehicle/position |
| `INVALID_POSITION`       | 400         | Invalid position value              |
| `INVALID_REGION`         | 400         | Invalid region code                 |
| `MISSING_REQUIRED_FIELD` | 400         | Required field missing              |
| `UNAUTHORIZED`           | 401         | Invalid API key                     |
| `RATE_LIMITED`           | 429         | Too many requests                   |
| `INTERNAL_ERROR`         | 500         | Server error                        |

---

## Implementation Guide

### Recommended Tech Stack

| Layer     | Technology                           |
| --------- | ------------------------------------ |
| Framework | NestJS (Node.js) or FastAPI (Python) |
| Database  | MySQL/MariaDB (NAGS native)          |
| Cache     | Redis (for VIN decode caching)       |
| API Docs  | Swagger/OpenAPI                      |

### Project Structure (NestJS)

```
src/
├── app.module.ts
├── main.ts
│
├── modules/
│   ├── glass/
│   │   ├── glass.module.ts
│   │   ├── glass.controller.ts
│   │   ├── glass.service.ts
│   │   ├── glass.repository.ts
│   │   └── dto/
│   │       ├── glass-lookup.dto.ts
│   │       └── glass-response.dto.ts
│   │
│   ├── vehicles/
│   │   ├── vehicles.module.ts
│   │   ├── vehicles.controller.ts
│   │   ├── vehicles.service.ts
│   │   ├── vin-decoder.service.ts
│   │   └── dto/
│   │       └── vehicle.dto.ts
│   │
│   └── hardware/
│       ├── hardware.module.ts
│       ├── hardware.service.ts
│       └── hardware.repository.ts
│
├── common/
│   ├── filters/
│   │   └── http-exception.filter.ts
│   ├── interceptors/
│   │   └── logging.interceptor.ts
│   └── guards/
│       └── api-key.guard.ts
│
└── database/
    └── nags.repository.ts
```

### SQL Query (Core Lookup)

```sql
-- Main glass lookup query
SELECT
    -- Vehicle
    mk.NAME AS make,
    mm.NAME AS model,
    v.MODEL_YR AS year,
    bs.DSC AS body_style,
    vm.DSC AS trim,
    v.VEH_ID,

    -- Glass
    ng.NAGS_GLASS_ID,
    ng.PREFIX_CD,
    ng.PART_NUM,
    np.DSC AS part_type,

    -- Features
    ng.HEATED_FLAG,
    ng.HDS_UP_DISP_FLAG,
    ng.ANT_FLAG,
    ng.SOLAR_FLAG,
    ng.ENCAP_FLAG,
    ng.SLIDER_FLAG,
    ng.THICKNESS,
    ng.WT,
    ng.BLK_SIZE1,
    ng.BLK_SIZE2,
    ng.NUM_HOLES,

    -- Pricing
    ngp.PRC,
    ngp.GLASS_COLOR_CD,
    gc.DSC AS glass_color,
    ngp.EFF_DT,
    ngp.PRC_STATUS_CD,
    ngp.PREM_FLAG,

    -- Labor
    ngc.NAGS_LABOR,
    vg.ADDITIONAL_NAGS_LABOR,

    -- Attachments
    ngc.MLDING_FLAG,
    ngc.CLIPS_FLAG,
    ngc.ATCHMNT_FLAG,
    ngc.ATCHMNT_DSC,

    -- Hardware Config
    vgr.NAGS_HW_CFG_ID

FROM `dbo.MAKE` mk
JOIN `dbo.MAKE_MODEL` mm ON mk.MAKE_ID = mm.MAKE_ID
JOIN `dbo.VEH` v ON mm.MAKE_MODEL_ID = v.MAKE_MODEL_ID
LEFT JOIN `dbo.BODY_STYLE` bs ON v.BODY_STYLE_ID = bs.BODY_STYLE_ID
LEFT JOIN `dbo.VEH_MODIFIER` vm ON v.VEH_MODIFIER_ID = vm.VEH_MODIFIER_ID
JOIN `dbo.VEH_GLASS` vg ON v.VEH_ID = vg.VEH_ID
JOIN `dbo.NAGS_GLASS` ng ON vg.NAGS_GLASS_ID = ng.NAGS_GLASS_ID
JOIN `dbo.NAGS_PREFIX` np ON ng.PREFIX_CD = np.PREFIX_CD
LEFT JOIN `dbo.NAGS_GLASS_CFG` ngc ON ng.NAGS_GLASS_ID = ngc.NAGS_GLASS_ID
LEFT JOIN `dbo.NAGS_GLASS_PRC` ngp ON ng.NAGS_GLASS_ID = ngp.NAGS_GLASS_ID
LEFT JOIN `dbo.GLASS_COLOR` gc ON ngp.GLASS_COLOR_CD = gc.GLASS_COLOR_CD
LEFT JOIN `dbo.VEH_GLASS_REGION` vgr ON v.VEH_ID = vgr.VEH_ID
    AND ng.NAGS_GLASS_ID = vgr.NAGS_GLASS_ID

WHERE mk.NAME LIKE :make
  AND mm.NAME LIKE :model
  AND v.MODEL_YR = :year
  AND ngp.REGION_CD = :region
  AND ng.PREFIX_CD IN (:prefixCodes)

ORDER BY ngp.PRC ASC;
```

### Caching Strategy

| Data              | Cache TTL | Key Pattern                 |
| ----------------- | --------- | --------------------------- |
| VIN Decode        | 24 hours  | `vin:{vin}`                 |
| Vehicle Lookup    | 1 hour    | `veh:{make}:{model}:{year}` |
| Glass Options     | 1 hour    | `glass:{vehId}:{position}`  |
| Hardware Pricing  | 4 hours   | `hw:{hwCfgId}`              |
| Makes/Models List | 24 hours  | `makes` / `models:{makeId}` |

---

## Rate Limits

| Plan       | Requests/Hour | Requests/Day |
| ---------- | ------------- | ------------ |
| Free       | 100           | 500          |
| Basic      | 1,000         | 10,000       |
| Pro        | 10,000        | 100,000      |
| Enterprise | Unlimited     | Unlimited    |

---

## Changelog

| Version | Date    | Changes         |
| ------- | ------- | --------------- |
| 1.0.0   | 2025-01 | Initial release |

---

_API Version: 1.0_  
_Last Updated: January 2025_
