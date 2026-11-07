from django.db import models


class Machine(models.Model):

    STATUS_CHOICES = [
        ("Available", "Available"),
        ("In Use", "In Use"),
        ("Maintenance", "Maintenance"),
    ]

    machine_number = models.CharField(
        max_length=50,
        unique=True
    )

    machine_code = models.CharField(
        max_length=50,
        unique=True
    )

    brand = models.CharField(
        max_length=100
    )

    location = models.CharField(
        max_length=100
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="Available"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        ordering = ["machine_number"]

    def __str__(self):
        return self.machine_number