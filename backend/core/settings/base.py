from pathlib import Path
import os
import environ

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env()
environ.Env.read_env(os.path.join(BASE_DIR, ".env"))

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.1/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = env("SECRET_KEY", default="django-insecure-default-key")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = env.bool("DEBUG", default=False)

ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=[])


# Application definition

DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.gis",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "django_filters",
    "corsheaders",
    "django_fsm",
    "drf_spectacular",
    "post_office",
]

LOCAL_APPS = [
    "core",
    "customers",
    "vehicles",
    "quotes",
    "pricing",
    "shops",
    "support_dashboard",
    "webhooks",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "core.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [os.path.join(BASE_DIR, "templates")],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "core.wsgi.application"


# Database
# https://docs.djangoproject.com/en/5.1/ref/settings/#databases

DATABASES = {
    "default": env.db(),
}

# NAGS MySQL Database (read-only, external)
# Only configure if environment variables are present
NAGS_DB_HOST = env("NAGS_DB_HOST", default=None)
if NAGS_DB_HOST:
    DATABASES["nags"] = {
        "ENGINE": "django.db.backends.mysql",
        "NAME": env("NAGS_DB_NAME", default="nags"),
        "USER": env("NAGS_DB_USER"),
        "PASSWORD": env("NAGS_DB_PASSWORD"),
        "HOST": NAGS_DB_HOST,
        "PORT": env("NAGS_DB_PORT", default="3306"),
        "OPTIONS": {
            "charset": "utf8mb4",
            "read_default_file": env("NAGS_DB_CONFIG_FILE", default=""),
        },
    }
    # Remove empty read_default_file option
    if not DATABASES["nags"]["OPTIONS"]["read_default_file"]:
        del DATABASES["nags"]["OPTIONS"]["read_default_file"]

# Database router for NAGS models (read-only)
DATABASE_ROUTERS = ["vehicles.routers.NAGSRouter"]


# Password validation
# https://docs.djangoproject.com/en/5.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation."
        "UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.1/topics/i18n/

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.1/howto/static-files/

STATIC_URL = "static/"
STATICFILES_DIRS = [os.path.join(BASE_DIR, "static")]

# Default primary key field type
# https://docs.djangoproject.com/en/5.1/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# REST Framework
REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
    "EXCEPTION_HANDLER": "core.utils.exception_handler.custom_exception_handler",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/day",
        "user": "1000/day",
    },
}

# CORS Configuration - Allow credentials for cookie-based auth
CORS_ALLOW_ALL_ORIGINS = False  # Security: Explicit origins only
CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS", default=["http://localhost:3333", "http://127.0.0.1:3333"]
)
CORS_ALLOW_CREDENTIALS = True  # Required for httpOnly cookies
CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",  # CSRF token header
    "x-requested-with",
]

# CSRF Configuration - Cookie-based protection
CSRF_COOKIE_NAME = "csrftoken"
CSRF_COOKIE_HTTPONLY = False  # Must be False so frontend can read it
CSRF_COOKIE_SECURE = not DEBUG  # HTTPS only in production
CSRF_COOKIE_SAMESITE = "Lax"  # CSRF protection
CSRF_COOKIE_PATH = "/"
CSRF_USE_SESSIONS = False  # Use cookie-based CSRF
CSRF_COOKIE_AGE = 31449600  # 1 year
CSRF_TRUSTED_ORIGINS = env.list(
    "CSRF_TRUSTED_ORIGINS", default=["http://localhost:3333", "http://127.0.0.1:3333"]
)

# Session Cookie Configuration
SESSION_COOKIE_SECURE = not DEBUG  # HTTPS only in production
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"

# Authentication Backends
AUTHENTICATION_BACKENDS = [
    "core.backends.EmailOrUsernameBackend",  # Try email/username first
    "django.contrib.auth.backends.ModelBackend",  # Fallback to default
]

# Spectacular
SPECTACULAR_SETTINGS = {
    "TITLE": "Auto Glass Quote API",
    "DESCRIPTION": "API for generating auto glass quotes",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

# JWT Settings
from datetime import timedelta  # noqa: E402

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=1),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
}

# Celery
CELERY_BROKER_URL = env("REDIS_URL")
CELERY_RESULT_BACKEND = env("REDIS_URL")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "UTC"

# Email
EMAIL_BACKEND = env(
    "EMAIL_BACKEND", default="django.core.mail.backends.smtp.EmailBackend"
)
EMAIL_HOST = env("EMAIL_HOST", default="mailhog")
EMAIL_PORT = env.int("EMAIL_PORT", default=1025)
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="noreply@autoglass.local")

# Frontend URL for email links
FRONTEND_URL = env("FRONTEND_URL", default="http://localhost:3333")

# AUTOBOLT API Configuration
AUTOBOLT_USER_ID = env("AUTOBOLT_USER_ID", default="")
AUTOBOLT_API_KEY = env("AUTOBOLT_API_KEY", default="")
AUTOBOLT_API_URL = env("AUTOBOLT_API_URL", default="https://autobolt.speedyautoparts.com")
AUTOBOLT_CACHE_TTL_DAYS = env.int("AUTOBOLT_CACHE_TTL_DAYS", default=30)

# Google Geocoding API
GOOGLE_GEOCODING_API_KEY = env("GOOGLE_GEOCODING_API_KEY", default="")

# Django Post Office
POST_OFFICE = {
    "BACKENDS": {
        "default": "django.core.mail.backends.smtp.EmailBackend",
    },
    "DEFAULT_PRIORITY": "now",  # Send immediately, but with retry capability
    "CELERY_ENABLED": True,  # Use Celery for sending emails
    "MAX_RETRIES": 3,  # Retry failed emails up to 3 times
    "RETRY_INTERVAL": timedelta(minutes=5),  # Wait 5 minutes between retries
    "LOG_LEVEL": 2,  # 0 = None, 1 = Failed, 2 = All
}

# Logging
LOG_LEVEL = env("LOG_LEVEL", default="INFO")

# Use verbose formatter for now (JSON logger causing issues in Celery)
DEFAULT_FORMATTER = "verbose"

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "()": "pythonjsonlogger.json.JsonFormatter",
            "format": "%(asctime)s %(levelname)s %(name)s %(message)s",
        },
        "verbose": {
            "format": "{levelname} {asctime} {module} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": DEFAULT_FORMATTER,
        },
    },
    "root": {
        "handlers": ["console"],
        "level": LOG_LEVEL,
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": LOG_LEVEL,
            "propagate": False,
        },
        "django.db.backends": {
            "handlers": ["console"],
            "level": "WARNING",  # Reduce noise from SQL queries
            "propagate": False,
        },
        "celery": {
            "handlers": ["console"],
            "level": LOG_LEVEL,
            "propagate": False,
        },
    },
}
