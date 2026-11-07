from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    PatientViewSet,
    PatientMedicalProfileViewSet,
    PatientLoginView,
    PatientDashboardView,
    PatientProfileView,
    PatientScheduleView,
    PatientHistoryView,
    PatientAccountCredentialsView,
)
from .views import (
    PatientPasswordResetLinkView,
    PatientPasswordResetView,
)

from .views import (
    PatientForgotPasswordView,
    # Keep your other existing view imports here.
)

router = DefaultRouter()

router.register(
    "patients",
    PatientViewSet,
    basename="patients",
)

router.register(
    "medical-profiles",
    PatientMedicalProfileViewSet,
    basename="medical-profiles",
)

# patients registered urls
urlpatterns = [
    path(
        "patients/login/",
        PatientLoginView.as_view(),
        name="patient-login",
    ),

    path(
        "patients/dashboard/",
        PatientDashboardView.as_view(),
        name="patient-dashboard",
    ),

    path(
        "patients/profile/",
        PatientProfileView.as_view(),
        name="patient-profile",
    ),

    path(
        "patients/schedule/",
        PatientScheduleView.as_view(),
    ),

    path(
        "patients/history/",
        PatientHistoryView.as_view(),
        name="patient-history",   
    ),
    path(
        "patients/<int:pk>/account-credentials/",
        PatientAccountCredentialsView.as_view(),
        name="patient-account-credentials",
    ),
    # Add these to your existing urlpatterns:
    
    path(
        "patients/<int:patient_id>/password-reset-link/",
        PatientPasswordResetLinkView.as_view(),
        name="patient-password-reset-link",
    ),
    path(
        "patients/password-reset/",
        PatientPasswordResetView.as_view(),
        name="patient-password-reset",
    ),
    path(
        "patients/forgot-password/",
        PatientForgotPasswordView.as_view(),
        name="patient-forgot-password",
    ),
    
]

urlpatterns += router.urls