from django.urls import path
from vehicles.api.views import IdentifyVehicleView

urlpatterns = [
    path("identify/", IdentifyVehicleView.as_view(), name="identify-vehicle"),
]
