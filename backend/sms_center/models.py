
from django.conf import settings
from django.db import models


class SMSMessage(models.Model):
    TYPE_CHOICES = [
        ("test", "Test SMS"),
        ("appointment_reminder", "Appointment Reminder"),
    ]

    STATUS_CHOICES = [
        ("simulated", "Simulated"),
        ("pending", "Pending"),
        ("sent", "Sent"),
        ("delivered", "Delivered"),
        ("failed", "Failed"),
    ]

    recipient_name = models.CharField(max_length=200, blank=True)
    recipient_number = models.CharField(max_length=30)
    message_type = models.CharField(
        max_length=30,
        choices=TYPE_CHOICES,
        default="test",
    )
    message = models.TextField()

    # Optional references to existing records.
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sms_messages",
    )
    schedule = models.ForeignKey(
        "schedules.Schedule",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sms_messages",
    )

    provider = models.CharField(max_length=50, default="mock")
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
    )
    provider_message_id = models.CharField(
        max_length=200,
        blank=True,
    )
    error_message = models.TextField(blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_sms_messages",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["status", "created_at"],
                name="sms_status_created_idx",
            ),
            models.Index(
                fields=["message_type", "created_at"],
                name="sms_type_created_idx",
            ),
        ]

    def __str__(self):
        return f"{self.recipient_number} - {self.status}"
