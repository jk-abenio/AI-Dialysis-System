
from rest_framework import serializers
from django.db.models import Max

from .models import Patient, PatientMedicalProfile


class PatientMedicalProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientMedicalProfile
        fields = "__all__"


class PatientSerializer(serializers.ModelSerializer):
    medical_profile = PatientMedicalProfileSerializer(
        read_only=True
    )

    age = serializers.ReadOnlyField()

    class Meta:
        model = Patient
        fields = "__all__"

        read_only_fields = [
            "patient_id",
            "age",
        ]

        extra_kwargs = {
            "password": {
                "write_only": True,
                "required": False,
                "allow_blank": True,
            }
        }

    def create(self, validated_data):
        # A password is optional during patient registration.
        # Patients can set their own password through the setup link.
        password = validated_data.pop("password", "")

        last_patient = Patient.objects.aggregate(
            Max("id")
        )["id__max"] or 0

        next_number = last_patient + 1
        patient_id = f"P{next_number:06d}"

        patient = Patient(
            patient_id=patient_id,
            **validated_data
        )

        # Only hash a password when one was explicitly provided.
        # An empty password must remain empty so it cannot be used
        # to log in before the patient sets their own password.
        if password:
            patient.set_password(password)

        patient.save()

        return patient

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Preserve the existing password unless a non-empty
        # replacement password is explicitly supplied.
        if password:
            instance.set_password(password)

        instance.save()

        return instance
