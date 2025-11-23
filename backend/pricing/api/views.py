from rest_framework.generics import ListAPIView
from drf_spectacular.utils import extend_schema

from pricing.models import InsuranceProvider
from pricing.api.serializers import InsuranceProviderSerializer


class InsuranceProviderListView(ListAPIView):
    """
    List all active insurance providers.
    """

    permission_classes = []
    serializer_class = InsuranceProviderSerializer
    queryset = InsuranceProvider.objects.filter(is_active=True)

    @extend_schema(
        summary="List Insurance Providers",
        description="Get a list of supported insurance providers.",
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
