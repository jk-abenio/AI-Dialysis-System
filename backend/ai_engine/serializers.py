from rest_framework import serializers
from django.utils import timezone



class RecommendationRequestSerializer(serializers.Serializer):
    patient_id = serializers.IntegerField(min_value=1)
    requested_date = serializers.DateField()
    requested_time = serializers.TimeField(
        required=False,
        allow_null=True,
    )

    def validate_requested_date(self, value):
        if value < timezone.localdate():
            raise serializers.ValidationError(
                "The requested date cannot be in the past."
            )

        return value

class BookRecommendationSerializer(serializers.Serializer):
    patient_id = serializers.IntegerField(min_value=1)
    requested_date = serializers.DateField()
    requested_time = serializers.TimeField()
    machine_id = serializers.IntegerField(min_value=1)
    staff_id = serializers.IntegerField(min_value=1)
    notes = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=2000,
    )

    def validate_requested_date(self, value):
        if value < timezone.localdate():
            raise serializers.ValidationError(
                "The requested date cannot be in the past."
            )

        return value