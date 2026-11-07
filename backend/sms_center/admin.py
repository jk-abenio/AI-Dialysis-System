
from django.contrib import admin
from .models import SMSMessage


@admin.register(SMSMessage)
class SMSMessageAdmin(admin.ModelAdmin):
    list_display = (
        "recipient_number",
        "recipient_name",
        "message_type",
        "provider",
        "status",
        "created_at",
    )
    list_filter = ("status", "message_type", "provider", "created_at")
    search_fields = (
        "recipient_number",
        "recipient_name",
        "message",
    )
    readonly_fields = (
        "created_at",
        "updated_at",
        "provider_message_id",
        "error_message",
    )
    ordering = ("-created_at",)
