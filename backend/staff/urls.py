
from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import StaffViewSet
from .auth_views import staff_login_view

router = DefaultRouter()
router.register("staff", StaffViewSet, basename="staff")

urlpatterns = [
    path("staff/login/", staff_login_view, name="staff-login"),
]

urlpatterns += router.urls
