from rest_framework.routers import DefaultRouter
from .views import MachineViewSet

router = DefaultRouter()

router.register("machines", MachineViewSet, basename="machines")
# router.register("", MachineViewSet)

urlpatterns = router.urls