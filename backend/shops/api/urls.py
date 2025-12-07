from django.urls import path
from shops.api.views import (
    CheckInStoreServiceView,
    CheckMobileServiceView,
    ShopsNearbyView,
)

urlpatterns = [
    path("check-in-store/", CheckInStoreServiceView.as_view(), name="check-in-store"),
    path("check-mobile/", CheckMobileServiceView.as_view(), name="check-mobile"),
    path("nearby/", ShopsNearbyView.as_view(), name="shops-nearby"),
]
