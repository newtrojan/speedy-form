from django.urls import path
from pricing.api.views import InsuranceProviderListView

urlpatterns = [
    path(
        "insurance-providers/",
        InsuranceProviderListView.as_view(),
        name="insurance-provider-list",
    ),
]
