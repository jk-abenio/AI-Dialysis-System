
import logging
import re

from django.conf import settings
from django.utils import timezone

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from patients.models import Patient
from schedules.models import Schedule

from .models import SMSMessage
from .providers import get_sms_provider
from .serializers import SMSMessageSerializer


logger = logging.getLogger(__name__)

MAX_SMS_LENGTH = 1600


def normalize_phone_number(value):
    if not isinstance(value, str):
        raise ValueError("Phone number must be text.")

    value = value.strip()

    if not value:
        raise ValueError("Phone number is required.")

    # Accept common international phone-number characters.
    if not re.fullmatch(r"[+0-9()\-\s]{7,30}", value):
        raise ValueError("Enter a valid phone number.")

    digits = re.sub(r"\D", "", value)

    if not 7 <= len(digits) <= 15:
        raise ValueError("Phone number must contain 7 to 15 digits.")

    return value


def create_sms_record(
    *,
    request,
    phone_number,
    message,
    message_type,
    recipient_name="",
    patient=None,
    schedule=None,
):
    provider_name = getattr(
        settings,
        "SMS_PROVIDER",
        "mock",
    ).strip().lower()

    record = SMSMessage.objects.create(
        recipient_name=recipient_name,
        recipient_number=phone_number,
        message_type=message_type,
        message=message,
        patient=patient,
        schedule=schedule,
        provider=provider_name,
        status="pending",
        created_by=request.user,
    )

    try:
        provider = get_sms_provider()
        result = provider.send(phone_number, message)

        record.provider = result.provider
        record.status = result.status
        record.provider_message_id = result.message_id
        record.error_message = result.error

    except Exception as exc:
        logger.exception("SMS provider operation failed")
        record.status = "failed"
        record.error_message = str(exc)[:2000]

    record.save(
        update_fields=[
            "provider",
            "status",
            "provider_message_id",
            "error_message",
            "updated_at",
        ]
    )

    return record


class SMSHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = SMSMessage.objects.select_related(
            "patient",
            "schedule",
            "created_by",
        )

        status_filter = request.query_params.get("status")
        type_filter = request.query_params.get("type")
        search = request.query_params.get("search", "").strip()

        valid_statuses = {
            choice[0] for choice in SMSMessage.STATUS_CHOICES
        }
        valid_types = {
            choice[0] for choice in SMSMessage.TYPE_CHOICES
        }

        if status_filter:
            if status_filter not in valid_statuses:
                return Response(
                    {"error": "Invalid SMS status filter."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            queryset = queryset.filter(status=status_filter)

        if type_filter:
            if type_filter not in valid_types:
                return Response(
                    {"error": "Invalid message type filter."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            queryset = queryset.filter(message_type=type_filter)

        if search:
            queryset = queryset.filter(
                recipient_number__icontains=search
            ) | queryset.filter(
                recipient_name__icontains=search
            )

        try:
            limit = int(request.query_params.get("limit", 50))
        except (TypeError, ValueError):
            limit = 50

        limit = min(max(limit, 1), 100)

        return Response({
            "results": SMSMessageSerializer(
                queryset.order_by("-created_at")[:limit],
                many=True,
            ).data,
            "total": queryset.count(),
        })


class SMSTestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        phone_number = request.data.get("phone_number", "")
        message = request.data.get("message", "")

        if not isinstance(message, str) or not message.strip():
            return Response(
                {"error": "Message is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        message = message.strip()

        if len(message) > MAX_SMS_LENGTH:
            return Response(
                {
                    "error": (
                        f"Message cannot exceed "
                        f"{MAX_SMS_LENGTH} characters."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            phone_number = normalize_phone_number(phone_number)
        except ValueError as exc:
            return Response(
                {"error": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        record = create_sms_record(
            request=request,
            phone_number=phone_number,
            message=message,
            message_type="test",
        )

        response_status = (
            status.HTTP_201_CREATED
            if record.status == "simulated"
            else status.HTTP_502_BAD_GATEWAY
        )

        return Response(
            {
                "message": (
                    "SMS simulated successfully."
                    if record.status == "simulated"
                    else "SMS simulation failed."
                ),
                "sms": SMSMessageSerializer(record).data,
                "simulation_only": record.status == "simulated",
            },
            status=response_status,
        )


class SMSPatientsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        patients = Patient.objects.filter(
            status="Active"
        ).order_by("last_name", "first_name")

        results = []

        for patient in patients:
            results.append({
                "id": patient.pk,
                "patient_id": patient.patient_id,
                "name": (
                    f"{patient.first_name} {patient.last_name}"
                ).strip(),
                "contact_number": patient.contact_number,
            })

        return Response({"results": results})


class SMSRemindersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()

        schedules = Schedule.objects.filter(
            status="Scheduled",
            dialysis_date__gte=today,
            patient__status="Active",
        ).select_related("patient").order_by(
            "dialysis_date",
            "dialysis_time",
        )

        results = []

        for schedule in schedules:
            patient = schedule.patient

            results.append({
                "schedule_id": schedule.pk,
                "patient_id": patient.pk,
                "patient_code": patient.patient_id,
                "patient_name": (
                    f"{patient.first_name} {patient.last_name}"
                ).strip(),
                "contact_number": patient.contact_number,
                "dialysis_date": schedule.dialysis_date,
                "dialysis_time": schedule.dialysis_time,
                "shift": schedule.shift,
            })

        return Response({"results": results})

    def post(self, request):
        schedule_ids = request.data.get("schedule_ids")

        if not isinstance(schedule_ids, list) or not schedule_ids:
            return Response(
                {
                    "error": (
                        "Provide a non-empty schedule_ids list."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(schedule_ids) > 100:
            return Response(
                {"error": "A maximum of 100 reminders can be processed at once."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if any(
            isinstance(item, bool) or not isinstance(item, int)
            for item in schedule_ids
        ):
            return Response(
                {"error": "Every schedule ID must be an integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        schedules = Schedule.objects.filter(
            pk__in=set(schedule_ids),
            status="Scheduled",
            dialysis_date__gte=timezone.localdate(),
            patient__status="Active",
        ).select_related("patient")

        found_ids = {schedule.pk for schedule in schedules}
        invalid_ids = sorted(set(schedule_ids) - found_ids)

        results = []

        for schedule in schedules:
            patient = schedule.patient

            try:
                phone_number = normalize_phone_number(
                    patient.contact_number
                )

                appointment_date = schedule.dialysis_date.strftime(
                    "%B %d, %Y"
                )
                appointment_time = schedule.dialysis_time.strftime(
                    "%I:%M %p"
                )

                message = (
                    f"Hello {patient.first_name}, this is a reminder "
                    f"of your upcoming dialysis appointment on "
                    f"{appointment_date} at {appointment_time}. "
                    f"Please contact the clinic if you need assistance. "
                    f"IMPORTANT: This is an automated message. Please do not reply "
                    f"to this SMS. For inquiries or assistance, please contact the clinic."
                )

                record = create_sms_record(
                    request=request,
                    phone_number=phone_number,
                    message=message,
                    message_type="appointment_reminder",
                    recipient_name=(
                        f"{patient.first_name} {patient.last_name}"
                    ).strip(),
                    patient=patient,
                    schedule=schedule,
                )

            except ValueError as exc:
                record = SMSMessage.objects.create(
                    recipient_name=(
                        f"{patient.first_name} {patient.last_name}"
                    ).strip(),
                    recipient_number=patient.contact_number or "",
                    message_type="appointment_reminder",
                    message=(
                        "Appointment reminder could not be prepared "
                        "because the patient's phone number is invalid."
                    ),
                    patient=patient,
                    schedule=schedule,
                    provider=getattr(
                        settings, "SMS_PROVIDER", "mock"
                    ).strip().lower(),
                    status="failed",
                    error_message=str(exc),
                    created_by=request.user,
                )

            results.append({
                "schedule_id": schedule.pk,
                "sms": SMSMessageSerializer(record).data,
            })

        return Response(
            {
                "message": "Reminder processing completed.",
                "simulation_only": True,
                "processed": len(results),
                "invalid_schedule_ids": invalid_ids,
                "results": results,
            },
            status=status.HTTP_201_CREATED,
        )

class SMSBulkSendView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        patient_ids = request.data.get("patient_ids")
        message = request.data.get("message", "")

        # Validate the selected patients.
        if not isinstance(patient_ids, list) or not patient_ids:
            return Response(
                {"error": "Select at least one patient."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(patient_ids) > 100:
            return Response(
                {"error": "A maximum of 100 patients can be processed at once."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if any(
            isinstance(patient_id, bool)
            or not isinstance(patient_id, int)
            for patient_id in patient_ids
        ):
            return Response(
                {"error": "Every patient ID must be an integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(set(patient_ids)) != len(patient_ids):
            return Response(
                {"error": "Duplicate patient IDs are not allowed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate the message.
        if not isinstance(message, str) or not message.strip():
            return Response(
                {"error": "Message cannot be empty."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        message = message.strip()

        if len(message) > MAX_SMS_LENGTH:
            return Response(
                {
                    "error": (
                        f"Message cannot exceed "
                        f"{MAX_SMS_LENGTH} characters."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Only process active patients found in the database.
        patients = Patient.objects.filter(
            pk__in=patient_ids,
            status="Active",
        ).order_by("last_name", "first_name")

        patients_by_id = {patient.pk: patient for patient in patients}

        missing_ids = [
            patient_id
            for patient_id in patient_ids
            if patient_id not in patients_by_id
        ]

        results = []

        for patient_id in patient_ids:
            patient = patients_by_id.get(patient_id)

            # Skip missing or inactive patients and report them.
            if patient is None:
                results.append({
                    "patient_id": patient_id,
                    "success": False,
                    "error": "Patient was not found or is inactive.",
                })
                continue

            patient_name = (
                f"{patient.first_name} {patient.last_name}"
            ).strip()

            try:
                # Always use the patient's registered number.
                phone_number = normalize_phone_number(
                    patient.contact_number
                )

                record = create_sms_record(
                    request=request,
                    phone_number=phone_number,
                    message=message,
                    message_type="test",
                    recipient_name=patient_name,
                    patient=patient,
                )

                results.append({
                    "patient_id": patient.pk,
                    "patient_name": patient_name,
                    "success": record.status == "simulated",
                    "sms": SMSMessageSerializer(record).data,
                })

            except ValueError as exc:
                # Record invalid numbers so the failure is visible
                # in SMS history instead of silently skipping them.
                record = SMSMessage.objects.create(
                    recipient_name=patient_name,
                    recipient_number=patient.contact_number or "",
                    message_type="test",
                    message=message,
                    patient=patient,
                    provider=getattr(
                        settings, "SMS_PROVIDER", "mock"
                    ).strip().lower(),
                    status="failed",
                    error_message=str(exc),
                    created_by=request.user,
                )

                results.append({
                    "patient_id": patient.pk,
                    "patient_name": patient_name,
                    "success": False,
                    "sms": SMSMessageSerializer(record).data,
                })

        successful = sum(
            1 for item in results if item.get("success") is True
        )
        failed = len(results) - successful

        return Response(
            {
                "message": "Bulk SMS processing completed.",
                "simulation_only": True,
                "selected": len(patient_ids),
                "processed": successful,
                "failed": failed,
                "invalid_patient_ids": missing_ids,
                "results": results,
            },
            status=status.HTTP_201_CREATED,
        )