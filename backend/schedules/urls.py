from rest_framework.routers import DefaultRouter
from .views import ScheduleViewSet
from .views import TreatmentRecordViewSet
router = DefaultRouter()

router.register("schedules", ScheduleViewSet, basename="schedules")

router.register("treatment-records",TreatmentRecordViewSet,basename="treatment-records",)
# router.register("", ScheduleViewSet)

urlpatterns = router.urls