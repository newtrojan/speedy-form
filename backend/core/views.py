from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.utils import timezone
from django.conf import settings
from drf_spectacular.utils import extend_schema


class HealthCheckView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Health Check",
        description="Returns the health status of the API",
        responses={
            200: {"type": "object", "properties": {"status": {"type": "string"}}}
        },
    )
    def get(self, request):
        return Response(
            {
                "status": "ok",
                "version": settings.SPECTACULAR_SETTINGS.get("VERSION", "1.0.0"),
                "timestamp": timezone.now().isoformat(),
            }
        )
