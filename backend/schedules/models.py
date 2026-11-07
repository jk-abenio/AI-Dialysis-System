from django.conf import settings
from django.db import models


class Schedule(models.Model):
    SHIFT_CHOICES = [
        ("Morning", "Morning"),
        ("Afternoon", "Afternoon"),
        ("Evening", "Evening"),
    ]

    STATUS_CHOICES = [
        ("Scheduled", "Scheduled"),
        ("Completed", "Completed"),
        ("Missed", "Missed"),
        ("Cancelled", "Cancelled"),
    ]

    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="schedules",
    )

    dialysis_date = models.DateField()
    dialysis_time = models.TimeField()

    shift = models.CharField(
        max_length=20,
        choices=SHIFT_CHOICES,
        default="Morning",
    )

    machine = models.ForeignKey(
        "machines.Machine",
        on_delete=models.CASCADE,
        related_name="schedules",
    )

    staff = models.ForeignKey(
        "staff.Staff",
        on_delete=models.CASCADE,
        related_name="schedules",
    )

    notes = models.TextField(blank=True)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="Scheduled",
    )

    # Audit information for treatment completion.
    # These fields remain nullable for existing schedules.
    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="completed_dialysis_schedules",
    )

    completed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    # Required by the backend when a Head Nurse completes
    # a schedule assigned to another staff member.
    completion_override_reason = models.TextField(
        blank=True,
        default="",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["dialysis_date", "dialysis_time"]
        indexes = [
            models.Index(
                fields=["machine", "dialysis_date", "status"],
                name="sched_machine_date_status_idx",
            ),
            models.Index(
                fields=["staff", "dialysis_date", "status"],
                name="sched_staff_date_status_idx",
            ),
            models.Index(
                fields=["patient", "dialysis_date", "status"],
                name="sched_patient_date_status_idx",
            ),
        ]

    def __str__(self):
        return f"{self.patient} - {self.dialysis_date}"


class TreatmentRecord(models.Model):
    schedule = models.OneToOneField(
        Schedule,
        on_delete=models.CASCADE,
        related_name="treatment_record",
    )

    pre_weight = models.FloatField()
    post_weight = models.FloatField()

    blood_pressure_before = models.CharField(max_length=20)
    blood_pressure_after = models.CharField(max_length=20)

    pulse_before = models.PositiveIntegerField()
    pulse_after = models.PositiveIntegerField()

    notes = models.TextField(blank=True)

    # Audit who entered the treatment measurements.
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_treatment_records",
    )

    # Audit who most recently edited the measurements.
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_treatment_records",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Treatment - {self.schedule.patient}"