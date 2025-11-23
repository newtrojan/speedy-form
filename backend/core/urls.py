from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from core.views import HealthCheckView
from core.auth_views import (
    LoginView,
    RefreshTokenView,
    LogoutView,
    CurrentUserView,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    # Health Check
    path("api/health/", HealthCheckView.as_view(), name="health-check"),
    # Auth
    path("api/v1/auth/login/", LoginView.as_view(), name="auth-login"),
    path("api/v1/auth/refresh/", RefreshTokenView.as_view(), name="auth-refresh"),
    path("api/v1/auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("api/v1/auth/me/", CurrentUserView.as_view(), name="auth-me"),
    # API Documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    # API v1
    path(
        "api/v1/",
        include(
            [
                path("vehicles/", include("vehicles.api.urls")),
                path("shops/", include("shops.api.urls")),
                path("pricing/", include("pricing.api.urls")),
                path("quotes/", include("quotes.api.urls")),
                path("support/", include("support_dashboard.api.urls")),
            ]
        ),
    ),
]
