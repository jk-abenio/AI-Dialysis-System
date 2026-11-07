from django.contrib import admin
from .models import Patient, PatientMedicalProfile


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "first_name",
        "last_name",
        "gender",
        "contact_number",
        "status",
    )

    search_fields = (
        "first_name",
        "last_name",
        "contact_number",
    )

    list_filter = (
        "gender",
        "status",
        "blood_type",
    )


admin.site.register(PatientMedicalProfile)