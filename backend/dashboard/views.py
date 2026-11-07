
from datetime import datetime, timedelta
from decimal import Decimal, InvalidOperation

from django.db.models import Count
from django.db.models.functions import Lower, Trim
from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from patients.models import Patient
from machines.models import Machine
from staff.models import Staff
from schedules.models import Schedule, TreatmentRecord
from schedules.serializers import ScheduleSerializer


def _normalized_status(field="status"):
    return Lower(Trim(field))


def _get_duration_hours(patient):
    """Return a valid dialysis duration, or None if unavailable."""
    try:
        duration = Decimal(
            str(patient.medical_profile.dialysis_duration)
        )
    except (
        AttributeError,
        InvalidOperation,
        TypeError,
        ValueError,
    ):
        return None

    if not duration.is_finite() or duration <= 0:
        return None

    return duration


def _get_existing_duration_hours(patient):
    """
    Match the existing ScheduleSerializer conflict-check fallback:
    use one hour if an existing appointment has an invalid duration.
    """
    return _get_duration_hours(patient) or Decimal("1")


def _appointment_details(schedule):
    return {
        "schedule_id": schedule.id,
        "patient_name": str(schedule.patient),
        "machine_name": schedule.machine.machine_number,
        "machine_status": schedule.machine.status,
        "staff_name": (
            f"{schedule.staff.first_name} "
            f"{schedule.staff.last_name}"
        ).strip(),
        "date": schedule.dialysis_date.isoformat(),
        "time": schedule.dialysis_time.strftime("%H:%M"),
        "shift": schedule.shift,
        "status": schedule.status,
    }


def _build_operational_alerts(today):
    alerts = []
    alert_number = 0

    def add_alert(alert):
        nonlocal alert_number
        alert_number += 1
        alert["id"] = f"operational-alert-{alert_number}"
        alerts.append(alert)

    # Load related data up front to reduce database queries.
    schedules = list(
        Schedule.objects.select_related(
            "patient",
            "patient__medical_profile",
            "machine",
            "staff",
        ).order_by("dialysis_date", "dialysis_time", "id")
    )

    # 1. Missed appointments for today.
    missed_today = [
        schedule
        for schedule in schedules
        if schedule.dialysis_date == today
        and str(schedule.status or "").strip().lower() == "missed"
    ]

    for schedule in missed_today:
        appointment = _appointment_details(schedule)

        add_alert({
            "type": "missed_session",
            "severity": "warning",
            "title": "Missed dialysis session",
            "message": (
                f"{appointment['patient_name']} has a missed "
                f"session scheduled for {appointment['time']}."
            ),
            "action": "Review the missed session and follow up with the patient.",
            "appointment": appointment,
        })

    # 2. Scheduled appointments assigned to unavailable machines.
    scheduled = [
        schedule
        for schedule in schedules
        if str(schedule.status or "").strip().lower() == "scheduled"
    ]

    for schedule in scheduled:
        machine_status = str(
            schedule.machine.status or ""
        ).strip().lower()

        if machine_status not in {"available"}:
            appointment = _appointment_details(schedule)

            add_alert({
                "type": "machine_unavailable",
                "severity": "critical",
                "title": "Machine is not available",
                "message": (
                    f"{appointment['machine_name']} is marked "
                    f"{appointment['machine_status']} but has a "
                    f"scheduled appointment for "
                    f"{appointment['patient_name']}."
                ),
                "action": (
                    "Review the machine status and reschedule or "
                    "reassign the appointment if necessary."
                ),
                "appointment": appointment,
            })

    # 3. Detect overlapping scheduled appointments.
    # Compare appointments on the same date. Cancelled, completed,
    # and missed appointments are not included in this check.
    by_date = {}

    for schedule in scheduled:
        by_date.setdefault(schedule.dialysis_date, []).append(schedule)

    for appointment_date, day_schedules in by_date.items():
        intervals = []

        for schedule in day_schedules:
            duration = _get_existing_duration_hours(schedule.patient)

            start = datetime.combine(
                schedule.dialysis_date,
                schedule.dialysis_time,
            )
            end = start + timedelta(
                seconds=float(duration * Decimal("3600"))
            )

            intervals.append({
                "schedule": schedule,
                "start": start,
                "end": end,
            })

        for index, first in enumerate(intervals):
            for second in intervals[index + 1:]:
                # Adjacent appointments are not overlapping.
                if not (
                    first["start"] < second["end"]
                    and second["start"] < first["end"]
                ):
                    continue

                first_schedule = first["schedule"]
                second_schedule = second["schedule"]

                conflict_resources = []

                if first_schedule.patient_id == second_schedule.patient_id:
                    conflict_resources.append("patient")

                if first_schedule.machine_id == second_schedule.machine_id:
                    conflict_resources.append("machine")

                if first_schedule.staff_id == second_schedule.staff_id:
                    conflict_resources.append("staff")

                if not conflict_resources:
                    continue

                first_details = _appointment_details(first_schedule)
                second_details = _appointment_details(second_schedule)

                resource_label = ", ".join(conflict_resources)

                add_alert({
                    "type": "scheduling_conflict",
                    "severity": "critical",
                    "title": "Overlapping appointments",
                    "message": (
                        f"{resource_label.capitalize()} conflict between "
                        f"{first_details['patient_name']} at "
                        f"{first_details['time']} and "
                        f"{second_details['patient_name']} at "
                        f"{second_details['time']}."
                    ),
                    "action": (
                        "Review both appointments and resolve the "
                        "overlap before treatment."
                    ),
                    "conflict_resources": conflict_resources,
                    "appointment": first_details,
                    "conflicting_appointment": second_details,
                })

    # Critical alerts first, then warnings.
    severity_order = {"critical": 0, "warning": 1, "info": 2}
    alerts.sort(
        key=lambda alert: (
            severity_order.get(alert["severity"], 3),
            alert.get("appointment", {}).get("date", ""),
            alert.get("appointment", {}).get("time", ""),
        )
    )

    return alerts


class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()

        all_schedules = Schedule.objects.annotate(
            normalized_status=_normalized_status()
        )

        today_schedules = all_schedules.filter(
            dialysis_date=today
        )

        completed_today = today_schedules.filter(
            normalized_status="completed"
        ).count()

        pending_today = today_schedules.filter(
            normalized_status="scheduled"
        ).count()

        missed_today = today_schedules.filter(
            normalized_status="missed"
        ).count()

        cancelled_today = today_schedules.filter(
            normalized_status="cancelled"
        ).count()

        # Completed sessions during the last seven days.
        seven_days_ago = today - timedelta(days=6)

        weekly_counts = (
            Schedule.objects.filter(
                dialysis_date__range=(seven_days_ago, today),
                status__iexact="Completed",
            )
            .values("dialysis_date")
            .annotate(total=Count("id"))
        )

        weekly_lookup = {
            item["dialysis_date"]: item["total"]
            for item in weekly_counts
        }

        treatments_last_7_days = []

        for i in range(6, -1, -1):
            current_day = today - timedelta(days=i)

            treatments_last_7_days.append({
                "day": current_day.strftime("%a"),
                "date": current_day.isoformat(),
                "completed": weekly_lookup.get(current_day, 0),
            })

        # Completed sessions by machine.
        machine_counts = (
            Schedule.objects.filter(
                status__iexact="Completed"
            )
            .values("machine_id")
            .annotate(total=Count("id"))
        )

        machine_lookup = {
            item["machine_id"]: item["total"]
            for item in machine_counts
        }

        machine_utilization = [
            {
                "machine": machine.machine_number,
                "completed": machine_lookup.get(machine.id, 0),
            }
            for machine in Machine.objects.all()
        ]

        # Completed sessions by active staff member.
        staff_counts = (
            Schedule.objects.filter(
                status__iexact="Completed"
            )
            .values("staff_id")
            .annotate(total=Count("id"))
        )

        staff_lookup = {
            item["staff_id"]: item["total"]
            for item in staff_counts
        }

        staff_workload = [
            {
                "staff": f"{member.first_name} {member.last_name}",
                "completed": staff_lookup.get(member.id, 0),
            }
            for member in Staff.objects.filter(status="Active")
        ]

        # Overall status distribution, including future appointments.
        schedule_status = [
            {
                "name": "Completed",
                "value": all_schedules.filter(
                    normalized_status="completed"
                ).count(),
            },
            {
                "name": "Scheduled",
                "value": all_schedules.filter(
                    normalized_status="scheduled"
                ).count(),
            },
            {
                "name": "Missed",
                "value": all_schedules.filter(
                    normalized_status="missed"
                ).count(),
            },
            {
                "name": "Cancelled",
                "value": all_schedules.filter(
                    normalized_status="cancelled"
                ).count(),
            },
        ]

        recent_schedules = (
            Schedule.objects.select_related(
                "patient",
                "machine",
                "staff",
            )
            .order_by("-id")[:5]
        )

        # New: calculate operational alerts from current database records.
        operational_alerts = _build_operational_alerts(today)

        return Response({
            "patients": Patient.objects.count(),
            "active_patients": Patient.objects.filter(
                status="Active"
            ).count(),

            "machines": Machine.objects.count(),
            "staff": Staff.objects.filter(
                status="Active"
            ).count(),

            "today_schedules": today_schedules.count(),
            "completed_today": completed_today,
            "pending_today": pending_today,
            "missed_today": missed_today,
            "cancelled_today": cancelled_today,

            "total_treatments": TreatmentRecord.objects.count(),

            "treatments_last_7_days": treatments_last_7_days,
            "recent_schedules": ScheduleSerializer(
                recent_schedules,
                many=True,
            ).data,

            "machine_utilization": machine_utilization,
            "staff_workload": staff_workload,
            "schedule_status": schedule_status,

            "scheduled_today": pending_today,
            "scheduled_total": sum(
                item["value"]
                for item in schedule_status
                if item["name"] == "Scheduled"
            ),

            # New operational alert data.
            "operational_alerts": operational_alerts,
            "operational_alerts_count": len(operational_alerts),
            "critical_alerts_count": sum(
                1 for alert in operational_alerts
                if alert["severity"] == "critical"
            ),
            "warning_alerts_count": sum(
                1 for alert in operational_alerts
                if alert["severity"] == "warning"
            ),
        })
