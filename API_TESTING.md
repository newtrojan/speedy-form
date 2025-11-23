# API Testing & Development Tools

## Bruno API Collection

Created comprehensive Bruno collection for testing all API endpoints.

### Setup

1. Install Bruno: https://www.usebruno.com/
2. Open collection from `bruno-collection/` directory
3. Backend must be running: `docker-compose up`

### Test Data

Seed the database with test data:

```bash
docker-compose exec backend python manage.py seed_test_data
```

**Created Data:**
- **Users:**
  - Admin: `admin@example.com` / `admin123`
  - Support Agent: `support@example.com` / `password123`
- **Shops:** SF Auto Glass (San Francisco), Austin Glass Pro
- **Vehicles:** 2020 Honda Accord, 2021 Tesla Model S
- **Quotes:** 2 pending validation, 1 sent (with approval token)

### API Endpoints in Collection

**Auth (2 endpoints):**
- Login - Auto-saves access/refresh tokens
- Current User - Verify authentication

**Public (4 endpoints):**
- Identify Vehicle - VIN lookup
- Check Mobile Service - Location serviceability
- Generate Quote - Async quote generation
- Quote Status - Poll generation status

**Support (4 endpoints):**
- Quote Queue - List with filters/search
- Quote Detail - Full quote info
- Validate Quote - Approve and send
- Reject Quote - Reject with reason

### Quick Test Flow

1. **Login:** Run `Auth/Login` with support credentials
2. **View Queue:** Run `Support/Quote Queue` to see pending quotes
3. **Validate:** Copy a quote ID, run `Support/Validate Quote`
4. **Check Email:** View sent email in Mailhog (http://localhost:8025)

## API Documentation

- **Swagger UI:** http://localhost:8000/api/docs/
- **ReDoc:** http://localhost:8000/api/redoc/
- **OpenAPI Schema:** http://localhost:8000/api/schema/

## Development Workflow

1. Start services: `docker-compose up`
2. Seed test data: `docker-compose exec backend python manage.py seed_test_data`
3. Test with Bruno collection
4. View emails in Mailhog: http://localhost:8025
5. Access admin: http://localhost:8000/admin (admin@example.com / admin123)
