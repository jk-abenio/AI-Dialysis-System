from django.db import models
from django.contrib.auth.hashers import make_password, check_password
from django.conf import settings

class Patient(models.Model):

    GENDER_CHOICES = [
        ("Male", "Male"),
        ("Female", "Female"),
    ]

    STATUS_CHOICES = [
        ("Active", "Active"),
        ("Inactive", "Inactive"),
    ]

    BLOOD_TYPES = [
        ("A+", "A+"),
        ("A-", "A-"),
        ("B+", "B+"),
        ("B-", "B-"),
        ("AB+", "AB+"),
        ("AB-", "AB-"),
        ("O+", "O+"),
        ("O-", "O-"),
    ]

    first_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100)
    patient_id = models.CharField(max_length=20,unique=True)
    password = models.CharField(max_length=128,default="",)
    birth_date = models.DateField()

    gender = models.CharField(
        max_length=10,
        choices=GENDER_CHOICES
    )

    blood_type = models.CharField(
        max_length=5,
        choices=BLOOD_TYPES
    )

    contact_number = models.CharField(max_length=20)

    email = models.EmailField(
        blank=True,
        null=True
    )

    address = models.TextField()

    emergency_contact = models.CharField(max_length=100)

    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default="Active"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def age(self):

        from datetime import date

        today = date.today()

        return (
            today.year
            - self.birth_date.year
            - (
                (today.month, today.day)
                <
                (self.birth_date.month, self.birth_date.day)
            )
        )

    def save(self, *args, **kwargs):

        creating = self.pk is None

        super().save(*args, **kwargs)

        if creating and not self.patient_id:

            self.patient_id = f"P{self.id:05d}"

            super().save(update_fields=["patient_id"])

    def set_password(self, raw_password):

        self.password = make_password(raw_password) 


    def check_password(self, raw_password):

        return check_password(raw_password, self.password)

    @property
    def is_authenticated(self):
        return True

class PatientMedicalProfile(models.Model):

    DIALYSIS_FREQUENCY = [
        ("2x/week", "2x/week"),
        ("3x/week", "3x/week"),
        ("4x/week", "4x/week"),
    ]

    SHIFT_CHOICES = [
        ("Morning", "Morning"),
        ("Afternoon", "Afternoon"),
        ("Evening", "Evening"),
    ]

    VASCULAR_ACCESS = [
        ("AV Fistula", "AV Fistula"),
        ("AV Graft", "AV Graft"),
        ("Catheter", "Catheter"),
    ]

    patient = models.OneToOneField(
        Patient,
        on_delete=models.CASCADE,
        related_name="medical_profile",
    )

    weight = models.FloatField()

    dialysis_frequency = models.CharField(
        max_length=20,
        choices=DIALYSIS_FREQUENCY,
    )

    dialysis_duration = models.DecimalField(
        max_digits=4,
        decimal_places=1,
    )

    preferred_shift = models.CharField(
        max_length=20,
        choices=SHIFT_CHOICES,
        blank=True,
    )

    diabetes = models.BooleanField(default=False)

    hypertension = models.BooleanField(default=False)

    vascular_access = models.CharField(
        max_length=30,
        choices=VASCULAR_ACCESS,
    )

    def __str__(self):
        return f"{self.patient} Medical Profile"

from django.conf import settings
from django.db import models


class PatientPasswordResetToken(models.Model):
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="password_reset_tokens",
    )
    token_hash = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_patient_password_resets",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Password reset for {self.patient}"

