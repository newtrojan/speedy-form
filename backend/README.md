# AutoGlass Quote API - Backend

This directory contains the Django backend for the AutoGlass Quote API.

## Prerequisites

- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Quick Start

1.  **Build and Start Services**
    ```bash
    docker-compose up --build
    ```
    The API will be available at `http://localhost:8000`.

2.  **Run Migrations**
    ```bash
    docker-compose run --rm backend python manage.py migrate
    ```

3.  **Create Superuser**
    ```bash
    docker-compose run --rm backend python manage.py createsuperuser
    ```

## Development Commands

### Database & Data Seeding

-   **Seed Initial Data** (Shops, Pricing, Mock Vehicles)
    ```bash
    docker-compose run --rm backend python manage.py seed_data
    docker-compose run --rm backend python manage.py seed_mock_vehicles
    ```

-   **Create Test Users & Groups**
    ```bash
    docker-compose run --rm backend python manage.py create_user_groups
    docker-compose run --rm backend python manage.py create_test_users
    ```
    *Creates `admin`, `support1`, and `customer1` users with password `[username]123`.*

### Testing & Quality

-   **Run Unit Tests**
    ```bash
    docker-compose run --rm backend python manage.py test
    ```

-   **Run Code Quality Checks** (Black, Flake8, Mypy)
    ```bash
    docker-compose run --rm backend bash -c "black . && flake8 . && mypy ."
    ```

-   **Format Code** (Black)
    ```bash
    docker-compose run --rm backend black .
    ```

### Shell Access

-   **Django Shell**
    ```bash
    docker-compose run --rm backend python manage.py shell
    ```

-   **Container Shell**
    ```bash
    docker-compose run --rm backend bash
    ```

## API Documentation

Once the server is running, you can access the interactive API documentation:

-   **Swagger UI:** [http://localhost:8000/api/docs/](http://localhost:8000/api/docs/)
-   **ReDoc:** [http://localhost:8000/api/redoc/](http://localhost:8000/api/redoc/)
-   **OpenAPI Schema:** [http://localhost:8000/api/schema/](http://localhost:8000/api/schema/)

## Services

-   **Django Backend:** `http://localhost:8000`
-   **Mailhog (Email Testing):** `http://localhost:8025`
-   **PostgreSQL (PostGIS):** Port `5432`
-   **Redis:** Port `6379`
