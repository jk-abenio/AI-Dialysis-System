from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),

    path("api/", include("accounts.urls")),   # Login / JWT
    path("api/", include("patients.urls")),   # Patients API
    path("api/", include("schedules.urls")), # schedules API
    path("api/", include("machines.urls")), # machines API
    path("api/", include("staff.urls")),  # staff API
    path("api/dashboard/", include("dashboard.urls")), # dashboard API
    path("api/reports/",include("reports.urls")), # reports API
    path("api/email/", include("email_center.urls")), #gmail Center  API
    path("api/ai/", include("ai_engine.urls")), # AI API
    path("api/sms/", include("sms_center.urls")),  # SMS Center API
]