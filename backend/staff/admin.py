from django.contrib import admin
from .models import Staff


@admin.register(Staff)
class StaffAdmin(admin.ModelAdmin):

    list_display = (
        "employee_id",
        "first_name",
        "last_name",
        "role",
        "contact_number",
        "status",
    )

    search_fields = (
        "employee_id",
        "first_name",
        "last_name",
        "email",
    )

    list_filter = (
        "role",
        "status",
    )