
from datetime import datetime, time, timedelta

from django.db import transaction
from django.utils import timezone

from patients.models import Patient, PatientMedicalProfile
from machines.models import Machine
from staff.models import Staff
from schedules.models import Schedule


# TEMPORARY DEVELOPMENT DEFAULTS.
# Replace these with clinic-confirmed operating hours and capacity.
SHIFT_HOURS = {
    "Morning": (time(6, 0), time(12, 0)),
    "Afternoon": (time(12, 0), time(18, 0)),
    "Evening": (time(18, 0), time(22, 0)),
}
RECOMMENDATION_INTERVAL_MINUTES = 30

RESOURCE_DAILY_APPOINTMENT_CAPACITY = 6
UPCOMING_SCHEDULE_DAYS = 40


def get_shift_hours(shift):
    """Return the configured start and end times for a shift."""
    return SHIFT_HOURS.get(shift)


def get_shift_for_time(requested_time, duration_hours):
    """Return the shift in which the entire appointment fits."""
    if requested_time is None:
        return None

    try:
        duration = float(duration_hours)
    except (TypeError, ValueError):
        return None

    if duration <= 0:
        return None

    appointment_start = datetime.combine(
        datetime.min.date(),
        requested_time,
    )
    appointment_end = appointment_start + timedelta(hours=duration)

    for shift, (shift_start, shift_end) in SHIFT_HOURS.items():
        shift_start_datetime = datetime.combine(
            datetime.min.date(),
            shift_start,
        )
        shift_end_datetime = datetime.combine(
            datetime.min.date(),
            shift_end,
        )

        if (
            shift_start_datetime <= appointment_start
            and appointment_end <= shift_end_datetime
        ):
            return shift

    return None


def get_treatment_duration(patient):
    """Return the patient's recorded treatment duration in hours."""
    try:
        duration = float(patient.medical_profile.dialysis_duration)

        if duration > 0:
            return duration

    except (
        PatientMedicalProfile.DoesNotExist,
        AttributeError,
        TypeError,
        ValueError,
    ):
        pass

    return None


def make_clinic_datetime(date_value, time_value):
    """Combine a clinic-local date and time into an aware datetime."""
    value = datetime.combine(date_value, time_value)

    if timezone.is_aware(value):
        return value

    return timezone.make_aware(
        value,
        timezone.get_current_timezone(),
    )


def has_schedule_conflict(resource_field, resource, start, end):
    """
    Check for overlapping scheduled appointments.

    Include the previous date for appointments that may cross midnight.
    Missing treatment durations conservatively block one hour.
    """
    first_date = start.date() - timedelta(days=1)
    last_date = end.date()

    schedules = (
        Schedule.objects.filter(
            **{resource_field: resource},
            dialysis_date__gte=first_date,
            dialysis_date__lte=last_date,
            status="Scheduled",
        )
        .select_related("patient", "patient__medical_profile")
    )

    for schedule in schedules:
        existing_duration = get_treatment_duration(schedule.patient)

        if existing_duration is None:
            existing_duration = 1.0

        existing_start = make_clinic_datetime(
            schedule.dialysis_date,
            schedule.dialysis_time,
        )
        existing_end = existing_start + timedelta(
            hours=existing_duration
        )

        if start < existing_end and existing_start < end:
            return True

    return False


def get_daily_workload(resource_field, resource, requested_date):
    """Count scheduled appointments assigned to a resource on a date."""
    return Schedule.objects.filter(
        **{resource_field: resource},
        dialysis_date=requested_date,
        status="Scheduled",
    ).count()


def get_resource_workload_summary(
    resource_field,
    resource,
    requested_date,
):
    """
    Return the requested-date workload and upcoming schedules.

    Patient names and medical information are not included.
    The percentage is based on configured appointment capacity,
    not actual utilization or clinical suitability.
    """
    capacity = RESOURCE_DAILY_APPOINTMENT_CAPACITY

    daily_count = get_daily_workload(
        resource_field,
        resource,
        requested_date,
    )

    workload_percentage = (
        min(100, round(daily_count / capacity * 100))
        if capacity > 0
        else None
    )

    today = timezone.localdate()
    end_date = today + timedelta(days=UPCOMING_SCHEDULE_DAYS)

    upcoming_schedules = (
        Schedule.objects.filter(
            **{resource_field: resource},
            dialysis_date__gte=today,
            dialysis_date__lte=end_date,
            status="Scheduled",
        )
        .order_by("dialysis_date", "dialysis_time")
    )

    schedule_list = [
        {
            "schedule_id": schedule.pk,
            "patient_id": schedule.patient_id,
            "date": schedule.dialysis_date.isoformat(),
            "time": schedule.dialysis_time.strftime("%H:%M"),
            "shift": schedule.shift,
            "status": schedule.status,
        }
        for schedule in upcoming_schedules
    ]

    return {
        "scheduled_count": daily_count,
        "daily_capacity": capacity,
        "workload_percentage": workload_percentage,
        "capacity_basis": "configured_daily_appointment_capacity",
        "upcoming_schedule_count": len(schedule_list),
        "upcoming_schedules": schedule_list,
    }



def recommend_schedules(patient_id, requested_date, requested_time=None):
    """
    Generate feasible machine/staff recommendations.

    If requested_time is None, scan the entire configured operating day
    at RECOMMENDATION_INTERVAL_MINUTES intervals.

    Recommendations are not automatically booked. Scores rank
    operational options; they are not clinical predictions.
    """
    try:
        patient = (
            Patient.objects.select_related("medical_profile")
            .get(pk=patient_id, status="Active")
        )
    except Patient.DoesNotExist:
        return {
            "success": False,
            "message": "Active patient not found.",
            "recommendations": [],
        }

    try:
        profile = patient.medical_profile
    except PatientMedicalProfile.DoesNotExist:
        return {
            "success": False,
            "message": "The patient has no medical profile.",
            "recommendations": [],
        }

    duration = get_treatment_duration(patient)

    if duration is None:
        return {
            "success": False,
            "message": (
                "The patient needs a valid dialysis duration "
                "in their medical profile."
            ),
            "recommendations": [],
        }

    if requested_date < timezone.localdate():
        return {
            "success": False,
            "message": "The requested date cannot be in the past.",
            "recommendations": [],
        }

    # Build candidate start times.
    candidates = []

    if requested_time is not None:
        shift = get_shift_for_time(requested_time, duration)

        if shift is None:
            return {
                "success": False,
                "message": (
                    "The requested appointment must fit entirely "
                    "within one configured clinic shift."
                ),
                "recommendations": [],
            }

        candidates.append((requested_time, shift))

    else:
        interval = timedelta(
            minutes=RECOMMENDATION_INTERVAL_MINUTES
        )

        base_date = requested_date

        for shift_name, (shift_start, shift_end) in SHIFT_HOURS.items():
            shift_start_dt = datetime.combine(base_date, shift_start)
            shift_end_dt = datetime.combine(base_date, shift_end)

            candidate_dt = shift_start_dt

            while candidate_dt + timedelta(hours=duration) <= shift_end_dt:
                candidates.append(
                    (candidate_dt.time(), shift_name)
                )
                candidate_dt += interval

    if not candidates:
        return {
            "success": True,
            "message": "No possible appointment times fit the configured operating hours.",
            "recommendations": [],
            "requested_date": requested_date.isoformat(),
            "mode": "full_day" if requested_time is None else "specific_time",
        }

    machines = list(
        Machine.objects.filter(status="Available")
    )

    staff_members = [
        member
        for member in Staff.objects.filter(status="Active")
        if member.role in ("Dialysis Nurse", "Head Nurse")
    ]

    recommendations = []
    machine_workloads = {}
    staff_workloads = {}

    for candidate_time, shift in candidates:
        start = make_clinic_datetime(
            requested_date,
            candidate_time,
        )
        end = start + timedelta(hours=duration)

        # A candidate must be in the future.
        if start <= timezone.now():
            continue

        # Do not recommend a slot that conflicts with the patient's
        # existing scheduled appointment.
        if has_schedule_conflict("patient", patient, start, end):
            continue

        for machine in machines:
            if has_schedule_conflict("machine", machine, start, end):
                continue

            if machine.pk not in machine_workloads:
                machine_workloads[machine.pk] = (
                    get_resource_workload_summary(
                        "machine",
                        machine,
                        requested_date,
                    )
                )

            machine_workload = machine_workloads[machine.pk]
            machine_load = machine_workload["scheduled_count"]

            for staff_member in staff_members:
                if has_schedule_conflict(
                    "staff",
                    staff_member,
                    start,
                    end,
                ):
                    continue

                if staff_member.pk not in staff_workloads:
                    staff_workloads[staff_member.pk] = (
                        get_resource_workload_summary(
                            "staff",
                            staff_member,
                            requested_date,
                        )
                    )

                staff_workload = staff_workloads[staff_member.pk]
                staff_load = staff_workload["scheduled_count"]

                # Preserve the existing operational ranking formula.
                score = max(
                    0,
                    min(
                        100,
                        80 - (5 * machine_load) - (5 * staff_load),
                    ),
                )

                reasons = [
                    "Machine is marked available.",
                    "Staff member is active and has an eligible role.",
                    (
                        "No overlapping appointment was found for "
                        "the patient, machine, or staff member."
                    ),
                    (
                        f"Machine has {machine_load} scheduled appointment(s) "
                        "on the requested date."
                    ),
                    (
                        f"Staff member has {staff_load} scheduled appointment(s) "
                        "on the requested date."
                    ),
                ]

                if profile.preferred_shift:
                    if shift == profile.preferred_shift:
                        score = min(100, score + 10)
                        reasons.append(
                            "Recommended shift matches the patient's "
                            "preferred shift."
                        )
                    else:
                        reasons.append(
                            "Recommended shift differs from the patient's "
                            "preferred shift."
                        )

                recommendations.append({
                    "patient_id": patient.pk,
                    "date": requested_date.isoformat(),
                    "time": candidate_time.strftime("%H:%M"),
                    "estimated_end_time": end.strftime("%H:%M"),
                    "shift": shift,
                    "preferred_shift": profile.preferred_shift or None,
                    "machine_id": machine.pk,
                    "machine_number": machine.machine_number,
                    "machine_workload": machine_workload,
                    "staff_id": staff_member.pk,
                    "staff_name": str(staff_member),
                    "staff_workload": staff_workload,
                    "score": score,
                    "reasons": reasons,
                })

    # Sort by time first so the frontend can display a daily schedule.
    # Within the same time, show the highest-scoring resource assignment first.
    recommendations.sort(
        key=lambda item: (
            item["time"],
            -item["score"],
            str(item["machine_number"]),
            item["staff_name"],
        )
    )

    return {
        "success": True,
        "message": (
            "Full-day recommendations generated."
            if requested_time is None and recommendations
            else "Recommendations generated."
            if recommendations
            else (
                "No feasible appointments were found for the selected date "
                "and operating hours."
                if requested_time is None
                else "No feasible recommendations found for the requested time."
            )
        ),
        "requested_date": requested_date.isoformat(),
        "mode": "full_day" if requested_time is None else "specific_time",
        "interval_minutes": (
            RECOMMENDATION_INTERVAL_MINUTES
            if requested_time is None
            else None
        ),
        "recommendations": recommendations,
    }


def book_recommended_schedule(
    patient_id,
    requested_date,
    requested_time,
    machine_id,
    staff_id,
    notes="",
):
    """
    Validate and book a recommended dialysis schedule.

    Recheck resources and conflicts before saving.
    """
    with transaction.atomic():
        try:
            patient = (
                Patient.objects.select_for_update()
                .get(pk=patient_id, status="Active")
            )
        except Patient.DoesNotExist:
            return {
                "success": False,
                "message": "Active patient not found.",
            }

        duration = get_treatment_duration(patient)

        if duration is None:
            return {
                "success": False,
                "message": (
                    "The patient needs a valid dialysis duration "
                    "in their medical profile."
                ),
            }

        shift = get_shift_for_time(requested_time, duration)

        if shift is None:
            return {
                "success": False,
                "message": (
                    "The appointment must fit entirely within "
                    "one configured clinic shift."
                ),
            }

        start = make_clinic_datetime(requested_date, requested_time)
        end = start + timedelta(hours=duration)

        if start <= timezone.now():
            return {
                "success": False,
                "message": "The appointment time must be in the future.",
            }

        try:
            machine = Machine.objects.select_for_update().get(
                pk=machine_id,
            )
        except Machine.DoesNotExist:
            return {
                "success": False,
                "message": "The selected machine was not found.",
            }

        if machine.status != "Available":
            return {
                "success": False,
                "message": "The selected machine is no longer available.",
            }

        try:
            staff_member = Staff.objects.select_for_update().get(
                pk=staff_id,
            )
        except Staff.DoesNotExist:
            return {
                "success": False,
                "message": "The selected staff member was not found.",
            }

        if staff_member.status != "Active":
            return {
                "success": False,
                "message": "The selected staff member is no longer active.",
            }

        if staff_member.role not in ("Dialysis Nurse", "Head Nurse"):
            return {
                "success": False,
                "message": (
                    "The selected staff member is not eligible "
                    "for dialysis scheduling."
                ),
            }

        if has_schedule_conflict("patient", patient, start, end):
            return {
                "success": False,
                "message": (
                    "The patient already has an overlapping "
                    "scheduled appointment."
                ),
            }

        if has_schedule_conflict("machine", machine, start, end):
            return {
                "success": False,
                "message": (
                    "The selected machine already has an overlapping "
                    "scheduled appointment."
                ),
            }

        if has_schedule_conflict("staff", staff_member, start, end):
            return {
                "success": False,
                "message": (
                    "The selected staff member already has an "
                    "overlapping scheduled appointment."
                ),
            }

        schedule = Schedule.objects.create(
            patient=patient,
            dialysis_date=requested_date,
            dialysis_time=requested_time,
            shift=shift,
            machine=machine,
            staff=staff_member,
            notes=notes,
            status="Scheduled",
        )

        return {
            "success": True,
            "message": "Dialysis schedule booked successfully.",
            "schedule": {
                "id": schedule.pk,
                "patient_id": patient.pk,
                "date": schedule.dialysis_date.isoformat(),
                "time": schedule.dialysis_time.strftime("%H:%M"),
                "shift": schedule.shift,
                "machine_id": machine.pk,
                "machine_number": machine.machine_number,
                "staff_id": staff_member.pk,
                "staff_name": str(staff_member),
                "status": schedule.status,
            },
        }
