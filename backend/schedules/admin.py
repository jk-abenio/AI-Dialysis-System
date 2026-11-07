from django.contrib import admin
from .models import Schedule


@admin.register(Schedule)
class ScheduleAdmin(admin.ModelAdmin):

    list_display = (
        "patient",
        "machine",
        "staff",
        "dialysis_date",
        "dialysis_time",
        "shift",
        "status",
    )

    list_filter = (
        "status",
        "shift",
        "dialysis_date",
    )

    search_fields = (
        "patient__first_name",
        "patient__last_name",
        "machine__machine_number",
        "staff__first_name",
        "staff__last_name",
    )