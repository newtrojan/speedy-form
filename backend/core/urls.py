from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from core.views import HealthCheckView

urlpatterns = [
    path("admin/", admin.site.urls),
    # Health Check
    path("api/health/", HealthCheckView.as_view(), name="health-check"),
    # Auth
    path("api/auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
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
            ]
        ),
    ),
]
