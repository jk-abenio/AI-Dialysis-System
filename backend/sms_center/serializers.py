
from rest_framework import serializers
from .models import SMSMessage


class SMSMessageSerializer(serializers.ModelSerializer):
    patient_id = serializers.CharField(
        source="patient.patient_id",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = SMSMessage
        fields = [
            "id",
            "recipient_name",
            "recipient_number",
            "message_type",
            "message",
            "patient",
            "patient_id",
            "schedule",
            "provider",
            "status",
            "provider_message_id",
            "error_message",
            "created_at",
        ]
        read_only_fields = fields
