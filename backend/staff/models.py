from django.conf import settings
from django.db import models


class Staff(models.Model):
    ROLE_CHOICES = [
        ("Dialysis Nurse", "Dialysis Nurse"),
        ("Head Nurse", "Head Nurse"),
        ("Technician", "Technician"),
        ("Doctor", "Doctor"),
    ]

    STATUS_CHOICES = [
        ("Active", "Active"),
        ("On Leave", "On Leave"),
        ("Inactive", "Inactive"),
    ]

    # Existing staff information
    employee_id = models.CharField(max_length=50, unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)

    role = models.CharField(
        max_length=50,
        choices=ROLE_CHOICES,
        default="Dialysis Nurse",
    )

    contact_number = models.CharField(max_length=20)
    email = models.EmailField(unique=True)

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="Active",
    )

    # Optional link to the existing Django authentication account.
    # Existing staff profiles remain valid until an account is linked.
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="staff_profile",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["last_name", "first_name"]

    def __str__(self):
        return f"{self.first_name} {self.last_name}"