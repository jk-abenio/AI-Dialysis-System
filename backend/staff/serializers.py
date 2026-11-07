
from rest_framework import serializers

from .models import Staff


class StaffSerializer(serializers.ModelSerializer):
    class Meta:
        model = Staff
        fields = "__all__"

        # These fields are managed by the backend, not by
        # ordinary staff-profile create/update requests.
        read_only_fields = [
            "id",
            "user",
            "created_at",
        ]

    def validate_employee_id(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Employee ID is required."
            )

        return value

    def validate_email(self, value):
        value = value.strip().lower()

        queryset = Staff.objects.filter(email__iexact=value)

        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)

        if queryset.exists():
            raise serializers.ValidationError(
                "This email address is already assigned to another staff profile."
            )

        return value

    def validate(self, attrs):
        status_value = attrs.get(
            "status",
            getattr(self.instance, "status", None),
        )

        if status_value not in dict(Staff.STATUS_CHOICES):
            raise serializers.ValidationError({
                "status": "Select a valid staff status."
            })

        role_value = attrs.get(
            "role",
            getattr(self.instance, "role", None),
        )

        if role_value not in dict(Staff.ROLE_CHOICES):
            raise serializers.ValidationError({
                "role": "Select a valid staff role."
            })

        return attrs
