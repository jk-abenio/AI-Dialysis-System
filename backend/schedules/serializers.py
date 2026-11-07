
from rest_framework import serializers

from .models import Schedule, TreatmentRecord


class ScheduleSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    machine_name = serializers.SerializerMethodField()
    staff_name = serializers.SerializerMethodField()

    class Meta:
        model = Schedule
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_at",
            "completed_by",
            "completed_at",
            "completion_override_reason",
        ]

    def get_patient_name(self, obj):
        return str(obj.patient)

    def get_machine_name(self, obj):
        return obj.machine.machine_number

    def get_staff_name(self, obj):
        return f"{obj.staff.first_name} {obj.staff.last_name}"

    def validate(self, attrs):
        from datetime import datetime, timedelta
        from decimal import Decimal, InvalidOperation

        from ai_engine.services import get_shift_for_time

        patient = attrs.get(
            "patient",
            self.instance.patient if self.instance else None,
        )
        machine = attrs.get(
            "machine",
            self.instance.machine if self.instance else None,
        )
        staff = attrs.get(
            "staff",
            self.instance.staff if self.instance else None,
        )
        dialysis_date = attrs.get(
            "dialysis_date",
            self.instance.dialysis_date if self.instance else None,
        )
        dialysis_time = attrs.get(
            "dialysis_time",
            self.instance.dialysis_time if self.instance else None,
        )
        selected_status = attrs.get(
            "status",
            self.instance.status if self.instance else "Scheduled",
        )
        selected_shift = attrs.get(
            "shift",
            self.instance.shift if self.instance else "Morning",
        )

        # Completion must happen through the treatment workflow.
        if selected_status == "Completed":
            if not self.instance or self.instance.status != "Completed":
                raise serializers.ValidationError({
                    "status": (
                        "Use the treatment completion workflow to mark "
                        "a schedule as completed."
                    )
                })

        # Completed schedules are immutable through this serializer.
        if self.instance and self.instance.status == "Completed":
            changed_fields = set(attrs.keys()) - {"status"}

            if changed_fields:
                raise serializers.ValidationError(
                    "Completed schedules cannot be edited."
                )

        # Cancelled appointments do not reserve resources.
        if selected_status == "Cancelled":
            return attrs

        # Do not allow new assignments to unavailable machines.
        if machine and machine.status != "Available":
            same_existing_machine = (
                self.instance is not None
                and machine.pk == self.instance.machine_id
            )

            if not same_existing_machine:
                raise serializers.ValidationError({
                    "machine": (
                        f"Machine {machine.machine_number} is "
                        f"{machine.status} and cannot be booked."
                    )
                })

        if staff:
            if staff.status != "Active":
                raise serializers.ValidationError({
                    "staff": (
                        f"{staff.first_name} {staff.last_name} is "
                        f"{staff.status} and cannot be assigned."
                    )
                })

            if staff.role not in ("Dialysis Nurse", "Head Nurse"):
                raise serializers.ValidationError({
                    "staff": (
                        "Only Dialysis Nurses and Head Nurses can be "
                        "assigned to dialysis schedules."
                    )
                })

        if patient and patient.status != "Active":
            raise serializers.ValidationError({
                "patient": "Only active patients can be scheduled."
            })

        if not all([
            patient,
            machine,
            staff,
            dialysis_date,
            dialysis_time,
        ]):
            return attrs

        try:
            duration = Decimal(str(
                patient.medical_profile.dialysis_duration
            ))
        except (
            AttributeError,
            InvalidOperation,
            TypeError,
            ValueError,
        ):
            raise serializers.ValidationError({
                "patient": (
                    "The patient must have a valid dialysis duration "
                    "in their medical profile before booking."
                )
            })

        if not duration.is_finite() or duration <= 0:
            raise serializers.ValidationError({
                "patient": "Dialysis duration must be greater than zero."
            })

        # The complete treatment must fit within a single clinic shift.
        expected_shift = get_shift_for_time(
            dialysis_time,
            float(duration),
        )

        if expected_shift is None:
            raise serializers.ValidationError({
                "dialysis_time": (
                    "The treatment must fit entirely within clinic "
                    "operating hours and a single shift."
                )
            })

        if selected_shift != expected_shift:
            raise serializers.ValidationError({
                "shift": (
                    f"This appointment belongs to the {expected_shift} "
                    "shift based on its start time and treatment duration."
                )
            })

        start = datetime.combine(dialysis_date, dialysis_time)
        end = start + timedelta(
            seconds=float(duration * Decimal("3600"))
        )

        # Exclude cancelled schedules from conflict checking.
        queryset = Schedule.objects.exclude(status="Cancelled")

        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)

        conflicts = {
            "patient": queryset.filter(patient=patient),
            "machine": queryset.filter(machine=machine),
            "staff": queryset.filter(staff=staff),
        }

        for field, schedules in conflicts.items():
            for existing in schedules.select_related("patient"):
                try:
                    existing_duration = Decimal(str(
                        existing.patient.medical_profile.dialysis_duration
                    ))

                    if (
                        not existing_duration.is_finite()
                        or existing_duration <= 0
                    ):
                        existing_duration = Decimal("1")

                except (
                    AttributeError,
                    InvalidOperation,
                    TypeError,
                    ValueError,
                ):
                    # Reserve one hour if an existing duration is invalid.
                    existing_duration = Decimal("1")

                existing_start = datetime.combine(
                    existing.dialysis_date,
                    existing.dialysis_time,
                )
                existing_end = existing_start + timedelta(
                    seconds=float(
                        existing_duration * Decimal("3600")
                    )
                )

                if start < existing_end and existing_start < end:
                    raise serializers.ValidationError({
                        field: (
                            f"This {field} has an overlapping appointment "
                            f"on {existing.dialysis_date} at "
                            f"{existing.dialysis_time.strftime('%H:%M')}."
                        )
                    })

        return attrs


class TreatmentRecordSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(
        source="schedule.patient",
        read_only=True,
    )
    machine_name = serializers.CharField(
        source="schedule.machine.machine_number",
        read_only=True,
    )
    staff_name = serializers.SerializerMethodField()
    dialysis_date = serializers.DateField(
        source="schedule.dialysis_date",
        read_only=True,
    )
    dialysis_time = serializers.TimeField(
        source="schedule.dialysis_time",
        read_only=True,
    )

    class Meta:
        model = TreatmentRecord
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]

    def get_staff_name(self, obj):
        return (
            f"{obj.schedule.staff.first_name} "
            f"{obj.schedule.staff.last_name}"
        )

    def validate_pre_weight(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Pre-treatment weight must be greater than zero."
            )
        return value

    def validate_post_weight(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Post-treatment weight must be greater than zero."
            )
        return value

    def validate_blood_pressure_before(self, value):
        self._validate_blood_pressure(value, "Pre-treatment")
        return value.strip()

    def validate_blood_pressure_after(self, value):
        self._validate_blood_pressure(value, "Post-treatment")
        return value.strip()

    @staticmethod
    def _validate_blood_pressure(value, label):
        import re

        if not re.fullmatch(
            r"\s*\d{2,3}\s*/\s*\d{2,3}\s*",
            value or "",
        ):
            raise serializers.ValidationError(
                f"{label} blood pressure must use the format 120/80."
            )

        systolic, diastolic = [
            int(part.strip()) for part in value.split("/")
        ]

        if not (50 <= systolic <= 300):
            raise serializers.ValidationError(
                f"{label} systolic input is outside the accepted "
                "validation range. Verify the reading."
            )

        if not (20 <= diastolic <= 200):
            raise serializers.ValidationError(
                f"{label} diastolic input is outside the accepted "
                "validation range. Verify the reading."
            )

    def validate_pulse_before(self, value):
        if not 1 <= value <= 300:
            raise serializers.ValidationError(
                "Pre-treatment pulse must be between 1 and 300."
            )
        return value

    def validate_pulse_after(self, value):
        if not 1 <= value <= 300:
            raise serializers.ValidationError(
                "Post-treatment pulse must be between 1 and 300."
            )
        return value
