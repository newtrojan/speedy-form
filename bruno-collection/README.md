# Auto Glass Quote API - Bruno Collection

This directory contains the Bruno API collection for testing all endpoints.

## Setup

1. Install Bruno: https://www.usebruno.com/
2. Open Bruno and select "Open Collection"
3. Navigate to this `bruno-collection` directory
4. The collection will load with all endpoints

## Collection Structure

```
bruno-collection/
├── Auth/
│   ├── Login.bru
│   ├── Current User.bru
│   ├── Refresh Token.bru
│   └── Logout.bru
├── Public/
│   ├── Identify Vehicle.bru
│   ├── Check Mobile Service.bru
│   ├── Check In-Store Service.bru
│   ├── List Shops.bru
│   ├── Get Pricing Config.bru
│   ├── Generate Quote.bru
│   ├── Quote Status.bru
│   ├── Quote Preview.bru
│   └── Approve Quote.bru
├── Support/
│   ├── Quote Queue.bru
│   ├── Quote Detail.bru
│   ├── Validate Quote.bru
│   ├── Reject Quote.bru
│   ├── Modify Quote.bru
│   └── Customer Detail.bru
└── System/
    └── Health Check.bru
```

## Environment Variables

The collection uses the following variables (configured in `bruno.json`):

- `base_url`: http://localhost:8000
- `access_token`: Auto-populated after login
- `refresh_token`: Auto-populated after login
- `task_id`: Auto-populated after generating a quote
- `quote_id`: Manually set to test specific quotes

## Usage

### 1. Start the Backend

```bash
docker-compose up
```

### 2. Seed Test Data

```bash
docker-compose exec backend python manage.py seed_test_data
```

This creates:
- **Users:**
  - Admin: `admin@example.com` / `admin123`
  - Support Agent: `support@example.com` / `password123`
- **Shops:** SF Auto Glass, Austin Glass Pro
- **Vehicles:** Honda Accord, Tesla Model S
- **Quotes:** 2 pending validation quotes, 1 sent quote

### API Endpoints in Collection

**Auth (4 endpoints):**
- Login - Auto-saves access/refresh tokens
- Current User - Verify authentication
- Refresh Token - Get new access token
- Logout - Blacklist refresh token

**Public (9 endpoints):**
- Identify Vehicle - VIN lookup
- Check Mobile Service - Location serviceability for mobile
- Check In-Store Service - Location serviceability for in-store
- List Shops - All available shops
- Get Pricing Config - Current pricing configuration
- Generate Quote - Async quote generation
- Quote Status - Poll generation status
- Quote Preview - View generated quote
- Approve Quote - Customer approval with token

**Support (6 endpoints):**
- Quote Queue - List with filters/search/ordering
- Quote Detail - Full quote information
- Validate Quote - Approve and send to customer
- Reject Quote - Reject with reason
- Modify Quote - Edit line items and notes
- Customer Detail - Customer info with history

**System (1 endpoint):**
- Health Check - System status

### 3. Test Authentication Flow

1. Run `Auth/Login.bru` with `support@example.com` / `password123`
2. Access token will be automatically saved
3. Run `Auth/Current User.bru` to verify authentication

### 4. Test Public API Flow

1. `Public/Identify Vehicle.bru` - Identify vehicle by VIN
2. `Public/Check Mobile Service.bru` - Check if location is serviceable
3. `Public/Generate Quote.bru` - Generate a quote (saves task_id)
4. `Public/Quote Status.bru` - Poll quote generation status

### 5. Test Support Dashboard

1. Login as support agent first
2. `Support/Quote Queue.bru` - View pending quotes
3. Copy a quote ID and set it as `quote_id` variable
4. `Support/Validate Quote.bru` - Approve and send quote
5. `Support/Reject Quote.bru` - Reject quote with reason

## API Documentation

Full API documentation available at:
- Swagger UI: http://localhost:8000/api/docs/
- ReDoc: http://localhost:8000/api/redoc/
- OpenAPI Schema: http://localhost:8000/api/schema/

## Tips

- Use the "Run All" feature to test entire workflows
- Check the "Response" tab for detailed error messages
- Use the "Env" tab to view/edit environment variables
- The login request automatically saves tokens for subsequent requests
