from django.contrib import admin
from .models import Machine


@admin.register(Machine)
class MachineAdmin(admin.ModelAdmin):

    list_display = (
        "machine_number",
        "machine_code",
        "brand",
        "location",
        "status",
    )

    search_fields = (
        "machine_number",
        "machine_code",
        "brand",
    )

    list_filter = (
        "status",
        "brand",
    )