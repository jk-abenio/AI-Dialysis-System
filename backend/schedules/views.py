
from django.db import transaction
from django.utils import timezone

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Schedule, TreatmentRecord
from .serializers import ScheduleSerializer, TreatmentRecordSerializer


def is_admin_user(user):
    return bool(
        user
        and user.is_authenticated
        and (user.is_staff or user.is_superuser)
    )


def get_staff_profile(user):
    try:
        staff = user.staff_profile
    except Exception:
        raise PermissionDenied(
            "Your account is not linked to a staff profile."
        )

    if not user.is_active or staff.status != "Active":
        raise PermissionDenied("Your staff profile is not active.")

    return staff


def can_access_schedule(staff, schedule):
    """Head Nurses can access all schedules; other staff see assigned ones."""
    return (
        staff.role == "Head Nurse"
        or schedule.staff_id == staff.id
    )


def require_treatment_permission(user, schedule):
    """Limit staff treatment access to assigned Dialysis Nurses and Head Nurses."""
    if is_admin_user(user):
        return None

    staff = get_staff_profile(user)

    if staff.role not in ("Dialysis Nurse", "Head Nurse"):
        raise PermissionDenied(
            "Only Dialysis Nurses, Head Nurses, and administrators "
            "can manage treatment records."
        )

    if not can_access_schedule(staff, schedule):
        raise PermissionDenied(
            "You are not authorized to access this schedule."
        )

    return staff


def get_override_reason(user, staff, schedule, request):
    """
    A Head Nurse completing another nurse's appointment must provide
    a reason. Administrators retain their existing privileges.
    """
    if not staff or staff.role != "Head Nurse":
        return ""

    if schedule.staff_id == staff.id:
        return ""

    reason = str(request.data.get("override_reason", "")).strip()

    if not reason:
        raise ValidationError({
            "override_reason": (
                "A reason is required when a Head Nurse completes "
                "a schedule assigned to another staff member."
            )
        })

    return reason


def save_treatment_and_complete(
    *,
    user,
    schedule,
    request,
    staff,
    existing_record=None,
):
    """Save validated treatment measurements and complete the session atomically."""
    if schedule.status == "Cancelled":
        raise ValidationError(
            "A cancelled schedule cannot be completed."
        )

    if schedule.status == "Missed":
        raise ValidationError(
            "A missed schedule cannot be completed. An authorized user "
            "must change its status before proceeding."
        )

    if schedule.status == "Completed":
        raise ValidationError(
            "This schedule is already completed. Edit its existing "
            "treatment record separately if a correction is required."
        )

    override_reason = get_override_reason(
        user, staff, schedule, request
    )

    allowed_fields = {
        "pre_weight",
        "post_weight",
        "blood_pressure_before",
        "blood_pressure_after",
        "pulse_before",
        "pulse_after",
        "notes",
    }

    payload = {
        field: request.data[field]
        for field in allowed_fields
        if field in request.data
    }
    payload["schedule"] = schedule.pk

    serializer = TreatmentRecordSerializer(
        existing_record,
        data=payload,
        context={"request": request},
    )
    serializer.is_valid(raise_exception=True)

    is_admin = is_admin_user(user)

    if existing_record:
        record = serializer.save(
            updated_by=None if is_admin else user,
        )
    else:
        record = serializer.save(
            created_by=None if is_admin else user,
            updated_by=None if is_admin else user,
        )

    schedule.status = "Completed"
    schedule.completed_by = user
    schedule.completed_at = timezone.now()
    schedule.completion_override_reason = override_reason
    schedule.save(update_fields=[
        "status",
        "completed_by",
        "completed_at",
        "completion_override_reason",
    ])

    return record


class ScheduleViewSet(viewsets.ModelViewSet):
    queryset = Schedule.objects.select_related(
        "patient",
        "machine",
        "staff",
    ).all()

    serializer_class = ScheduleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if is_admin_user(user):
            return queryset

        try:
            staff = user.staff_profile
        except Exception:
            return queryset.none()

        if not user.is_active or staff.status != "Active":
            return queryset.none()

        if staff.role == "Head Nurse":
            return queryset

        # Other staff can see their assigned schedules only.
        return queryset.filter(staff=staff)

    def perform_create(self, serializer):
        user = self.request.user

        if is_admin_user(user):
            serializer.save()
            return

        staff = get_staff_profile(user)

        if staff.role != "Head Nurse":
            raise PermissionDenied(
                "Only administrators and Head Nurses can create schedules."
            )

        serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        schedule = self.get_object()

        if is_admin_user(user):
            # ScheduleSerializer still validates permitted status changes,
            # scheduling conflicts, machine availability, and shift rules.
            serializer.save()
            return

        staff = get_staff_profile(user)

        if staff.role == "Dialysis Nurse":
            raise PermissionDenied(
                "Dialysis Nurses cannot edit schedule details, "
                "appointment times, machines, or staff assignments. "
                "Use the treatment-record or change-status actions instead."
            )

        if staff.role != "Head Nurse":
            raise PermissionDenied(
                "Your staff role is not permitted to edit schedules."
            )

        if not can_access_schedule(staff, schedule):
            raise PermissionDenied(
                "You are not authorized to edit this schedule."
            )

        if schedule.status == "Completed":
            raise ValidationError(
                "Completed schedules cannot be edited. Correct the "
                "existing treatment record separately if necessary."
            )

        if self.request.data.get("status") == "Completed":
            raise ValidationError({
                "status": (
                    "Use the treatment completion workflow to mark "
                    "a schedule as completed."
                )
            })

        serializer.save()

    def perform_destroy(self, instance):
        if not is_admin_user(self.request.user):
            raise PermissionDenied(
                "Only administrators can delete schedules."
            )

        instance.delete()

    @action(
        detail=False,
        methods=["get"],
        url_path=r"patient/(?P<patient_id>[^/.]+)",
    )
    def patient_history(self, request, patient_id=None):
        schedules = self.get_queryset().filter(
            patient_id=patient_id
        ).order_by("-dialysis_date", "-dialysis_time")

        return Response(
            self.get_serializer(schedules, many=True).data
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="change-status",
    )
    def change_status(self, request, pk=None):
        """
        Allow authorized users to mark a Scheduled session Cancelled or
        Missed without exposing other schedule fields to modification.
        """
        user = request.user

        with transaction.atomic():
            schedule = (
                self.get_queryset()
                .select_for_update()
                .get(pk=pk)
            )

            staff = None

            if not is_admin_user(user):
                staff = get_staff_profile(user)

                if staff.role not in ("Dialysis Nurse", "Head Nurse"):
                    raise PermissionDenied(
                        "Your staff role cannot change schedule status."
                    )

                if not can_access_schedule(staff, schedule):
                    raise PermissionDenied(
                        "You are not authorized to change this schedule."
                    )

            new_status = str(
                request.data.get("status", "")
            ).strip()

            if new_status not in ("Cancelled", "Missed"):
                raise ValidationError({
                    "status": (
                        "Only Cancelled or Missed can be set through this "
                        "action. Use the treatment-completion workflow "
                        "for Completed sessions."
                    )
                })

            if schedule.status != "Scheduled":
                raise ValidationError(
                    "Only scheduled sessions can be marked Cancelled "
                    "or Missed."
                )

            schedule.status = new_status
            schedule.save(update_fields=["status"])

        return Response({
            "success": True,
            "message": f"Schedule marked as {new_status}.",
            "schedule": ScheduleSerializer(
                schedule,
                context={"request": request},
            ).data,
        }, status=status.HTTP_200_OK)

    @action(
        detail=True,
        methods=["post"],
        url_path="complete-treatment",
    )
    def complete_treatment(self, request, pk=None):
        user = request.user
        is_admin = is_admin_user(user)

        with transaction.atomic():
            schedule = (
                self.get_queryset()
                .select_for_update()
                .get(pk=pk)
            )

            staff = None
            if not is_admin:
                staff = require_treatment_permission(user, schedule)

            existing_record = TreatmentRecord.objects.filter(
                schedule=schedule
            ).first()

            record = save_treatment_and_complete(
                user=user,
                schedule=schedule,
                request=request,
                staff=staff,
                existing_record=existing_record,
            )

        return Response({
            "success": True,
            "message": "Treatment saved and schedule completed.",
            "schedule": ScheduleSerializer(
                schedule,
                context={"request": request},
            ).data,
            "treatment_record": TreatmentRecordSerializer(
                record,
                context={"request": request},
            ).data,
        }, status=status.HTTP_200_OK)


class TreatmentRecordViewSet(viewsets.ModelViewSet):
    queryset = TreatmentRecord.objects.select_related(
        "schedule",
        "schedule__patient",
        "schedule__machine",
        "schedule__staff",
    ).all().order_by("-created_at")

    serializer_class = TreatmentRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if is_admin_user(user):
            return queryset

        try:
            staff = user.staff_profile
        except Exception:
            return queryset.none()

        if not user.is_active or staff.status != "Active":
            return queryset.none()

        if staff.role == "Head Nurse":
            return queryset

        # Other staff can only see treatment records for their own schedules.
        return queryset.filter(schedule__staff=staff)

    def _require_schedule_access(self, schedule):
        return require_treatment_permission(
            self.request.user,
            schedule,
        )

    def perform_create(self, serializer):
        schedule = serializer.validated_data.get("schedule")

        if schedule is None:
            raise ValidationError({
                "schedule": "A schedule is required."
            })

        staff = self._require_schedule_access(schedule)

        if schedule.status in ("Cancelled", "Missed", "Completed"):
            raise ValidationError({
                "schedule": (
                    "A treatment record cannot be created for a cancelled, "
                    "missed, or already completed schedule."
                )
            })

        if TreatmentRecord.objects.filter(schedule=schedule).exists():
            raise ValidationError({
                "schedule": (
                    "A treatment record already exists for this schedule. "
                    "Update the existing record instead."
                )
            })

        serializer.save(
            created_by=self.request.user if staff else None,
            updated_by=self.request.user if staff else None,
        )

    def perform_update(self, serializer):
        record = self.get_object()
        staff = self._require_schedule_access(record.schedule)

        if (
            "schedule" in serializer.validated_data
            and serializer.validated_data["schedule"].pk
            != record.schedule_id
        ):
            raise ValidationError({
                "schedule": "A treatment record cannot be reassigned."
            })

        if record.schedule.status in ("Cancelled", "Missed"):
            raise ValidationError(
                "Treatment records for cancelled or missed schedules "
                "cannot be edited."
            )

        serializer.save(
            updated_by=self.request.user if staff else None,
        )

    def perform_destroy(self, instance):
        if not is_admin_user(self.request.user):
            raise PermissionDenied(
                "Only administrators can delete treatment records."
            )

        instance.delete()

    @action(
        detail=True,
        methods=["post"],
        url_path="complete",
    )
    def complete(self, request, pk=None):
        user = request.user

        with transaction.atomic():
            record_ref = self.get_object()

            schedule = Schedule.objects.select_for_update().get(
                pk=record_ref.schedule_id
            )

            record = TreatmentRecord.objects.select_for_update().get(
                pk=record_ref.pk
            )

            staff = self._require_schedule_access(schedule)

            saved_record = save_treatment_and_complete(
                user=user,
                schedule=schedule,
                request=request,
                staff=staff,
                existing_record=record,
            )

        return Response({
            "success": True,
            "message": (
                "Treatment measurements saved and schedule completed."
            ),
            "schedule": ScheduleSerializer(
                schedule,
                context={"request": request},
            ).data,
            "treatment_record": TreatmentRecordSerializer(
                saved_record,
                context={"request": request},
            ).data,
        }, status=status.HTTP_200_OK)

    @action(
        detail=False,
        methods=["get"],
        url_path=r"patient/(?P<patient_id>[^/.]+)",
    )
    def patient_history(self, request, patient_id=None):
        records = self.get_queryset().filter(
            schedule__patient_id=patient_id
        ).order_by("-created_at")

        return Response(
            self.get_serializer(records, many=True).data
        )

    @action(
        detail=False,
        methods=["get"],
        url_path=r"patient/(?P<patient_id>[^/.]+)/chart",
    )
    def patient_chart(self, request, patient_id=None):
        records = self.get_queryset().filter(
            schedule__patient_id=patient_id
        ).order_by("created_at")

        return Response([
            {
                "date": record.created_at.strftime("%b %d"),
                "pre_weight": record.pre_weight,
                "post_weight": record.post_weight,
                "pulse_before": record.pulse_before,
                "pulse_after": record.pulse_after,
            }
            for record in records
        ])
