from datetime import date, time, timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from patients.models import Patient, PatientMedicalProfile
from machines.models import Machine
from staff.models import Staff
from schedules.models import Schedule

from ai_engine.services import (
    get_shift_for_time,
    get_treatment_duration,
    recommend_schedules,
)
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

class ShiftDetectionTests(TestCase):
    """Test clinic shift detection and appointment boundaries."""

    def test_morning_shift(self):
        self.assertEqual(
            get_shift_for_time(time(8, 0), 0.5),
            "Morning",
        )

    def test_afternoon_shift(self):
        self.assertEqual(
            get_shift_for_time(time(13, 0), 0.5),
            "Afternoon",
        )

    def test_evening_shift(self):
        self.assertEqual(
            get_shift_for_time(time(19, 0), 0.5),
            "Evening",
        )

    def test_time_outside_clinic_hours(self):
        self.assertIsNone(
            get_shift_for_time(time(22, 0), 0.5)
        )

    def test_appointment_cannot_cross_shift_closing(self):
        self.assertIsNone(
            get_shift_for_time(time(21, 45), 0.5)
        )

    def test_appointment_fitting_exactly_before_closing(self):
        self.assertEqual(
            get_shift_for_time(time(21, 30), 0.5),
            "Evening",
        )


class RecommendationServiceTests(TestCase):
    """Test recommendation generation using isolated test data."""

    def setUp(self):
        self.patient = Patient.objects.create(
            first_name="Test",
            last_name="Patient",
            patient_id="TEST0001",
            password="test-password",
            birth_date=date(1990, 1, 1),
            gender="Male",
            blood_type="O+",
            status="Active",
        )

        PatientMedicalProfile.objects.create(
            patient=self.patient,
            weight=Decimal("65.0"),
            dialysis_frequency="3x/week",
            dialysis_duration=Decimal("0.5"),
            preferred_shift="Morning",
        )

        self.machine = Machine.objects.create(
            machine_number="TEST-M01",
            machine_code="TEST-CODE-01",
            brand="Test Brand",
            location="Test Room",
            status="Available",
        )

        self.staff = Staff.objects.create(
            employee_id="TEST-S001",
            first_name="Test",
            last_name="Nurse",
            role="Dialysis Nurse",
            status="Active",
            contact_number="0000000000",
            email="test-nurse@example.com",
        )

        self.requested_date = timezone.localdate() + timedelta(days=7)
        self.requested_time = time(8, 0)

    def test_generates_recommendation_for_available_resources(self):
        result = recommend_schedules(
            self.patient.pk,
            self.requested_date,
            self.requested_time,
        )

        self.assertTrue(result["success"])
        self.assertTrue(result["recommendations"])

        recommendation = result["recommendations"][0]

        self.assertEqual(
            recommendation["patient_id"],
            self.patient.pk,
        )
        self.assertEqual(
            recommendation["machine_id"],
            self.machine.pk,
        )
        self.assertEqual(
            recommendation["staff_id"],
            self.staff.pk,
        )
        self.assertEqual(recommendation["shift"], "Morning")
        self.assertEqual(recommendation["score"], 90)

    def test_rejects_inactive_patient(self):
        self.patient.status = "Inactive"
        self.patient.save(update_fields=["status"])

        result = recommend_schedules(
            self.patient.pk,
            self.requested_date,
            self.requested_time,
        )

        self.assertFalse(result["success"])
        self.assertEqual(result["recommendations"], [])

    def test_rejects_missing_requested_time(self):
        result = recommend_schedules(
            self.patient.pk,
            self.requested_date,
            None,
        )

        self.assertFalse(result["success"])
        self.assertEqual(result["recommendations"], [])

    def test_rejects_time_outside_configured_shifts(self):
        result = recommend_schedules(
            self.patient.pk,
            self.requested_date,
            time(22, 0),
        )

        self.assertFalse(result["success"])
        self.assertEqual(result["recommendations"], [])

    def test_rejects_patient_without_medical_profile(self):
        PatientMedicalProfile.objects.filter(
            patient=self.patient
        ).delete()

        result = recommend_schedules(
            self.patient.pk,
            self.requested_date,
            self.requested_time,
        )

        self.assertFalse(result["success"])
        self.assertIn("medical profile", result["message"].lower())
        self.assertEqual(result["recommendations"], [])

    def test_rejects_patient_without_valid_duration(self):
        profile = self.patient.medical_profile
        profile.dialysis_duration = Decimal("0.0")
        profile.save(update_fields=["dialysis_duration"])

        result = recommend_schedules(
            self.patient.pk,
            self.requested_date,
            self.requested_time,
        )

        self.assertFalse(result["success"])
        self.assertIn("duration", result["message"].lower())
        self.assertEqual(result["recommendations"], [])

    def test_excludes_machine_with_overlapping_appointment(self):
        Schedule.objects.create(
            patient=self.patient,
            dialysis_date=self.requested_date,
            dialysis_time=self.requested_time,
            shift="Morning",
            machine=self.machine,
            staff=self.staff,
            status="Scheduled",
        )

        result = recommend_schedules(
            self.patient.pk,
            self.requested_date,
            self.requested_time,
        )

        # The patient's own appointment also overlaps, so the service
        # should reject the request before recommending resources.
        self.assertFalse(result["success"])
        self.assertIn("overlapping", result["message"].lower())
        self.assertEqual(result["recommendations"], [])

    
    def test_returns_no_feasible_recommendations_when_resources_unavailable(self):
        self.machine.status = "Maintenance"
        self.machine.save(update_fields=["status"])

        self.staff.status = "Inactive"
        self.staff.save(update_fields=["status"])

        result = recommend_schedules(
            self.patient.pk,
            self.requested_date,
            self.requested_time,
        )

        self.assertTrue(result["success"])
        self.assertEqual(result["recommendations"], [])
        self.assertEqual(
            result["message"],
            "No feasible recommendations found for the requested time.",
        )


# test 2

    def test_excludes_unavailable_machine(self):
        self.machine.status = "Maintenance"
        self.machine.save(update_fields=["status"])

        result = recommend_schedules(
            self.patient.pk,
            self.requested_date,
            self.requested_time,
        )

        self.assertTrue(result["success"])
        self.assertEqual(result["recommendations"], [])

    def test_excludes_inactive_staff(self):
        self.staff.status = "Inactive"
        self.staff.save(update_fields=["status"])

        result = recommend_schedules(
            self.patient.pk,
            self.requested_date,
            self.requested_time,
        )

        self.assertTrue(result["success"])
        self.assertEqual(result["recommendations"], [])

    def test_excludes_staff_with_ineligible_role(self):
        self.staff.role = "Technician"
        self.staff.save(update_fields=["role"])

        result = recommend_schedules(
            self.patient.pk,
            self.requested_date,
            self.requested_time,
        )

        self.assertTrue(result["success"])
        self.assertEqual(result["recommendations"], [])

    def test_preferred_shift_bonus_is_applied(self):
        result = recommend_schedules(
            self.patient.pk,
            self.requested_date,
            time(8, 0),
        )

        self.assertTrue(result["success"])
        self.assertTrue(result["recommendations"])

        for recommendation in result["recommendations"]:
            self.assertEqual(recommendation["shift"], "Morning")
            self.assertEqual(recommendation["preferred_shift"], "Morning")
            self.assertEqual(recommendation["score"], 90)
            self.assertTrue(
                any(
                    "matches the patient's preferred shift" in reason
                    for reason in recommendation["reasons"]
                )
            )

    def test_recommendations_do_not_create_schedules(self):
        before_count = Schedule.objects.count()

        result = recommend_schedules(
            self.patient.pk,
            self.requested_date,
            self.requested_time,
        )

        self.assertTrue(result["success"])
        self.assertGreater(len(result["recommendations"]), 0)
        self.assertEqual(Schedule.objects.count(), before_count)

# test 3

class RecommendationAPISecurityTests(TestCase):
    """Verify authentication and authorization for the AI endpoint."""

    def setUp(self):
        self.client = APIClient()
        self.url = "/api/ai/recommendations/"
        self.User = get_user_model()

        self.regular_user = self.User.objects.create_user(
            username="test_regular_user",
            password="test-password-123",
            is_staff=False,
            is_superuser=False,
        )

        self.admin_user = self.User.objects.create_user(
            username="test_admin_user",
            password="test-password-123",
            is_staff=True,
            is_superuser=True,
        )

        # Valid-looking payload. The permission checks should run
        # before recommendation processing for unauthorized requests.
        self.payload = {
            "patient_id": 1,
            "requested_date": (
                timezone.localdate() + timedelta(days=7)
            ).isoformat(),
            "requested_time": "08:00",
        }

    def test_unauthenticated_request_is_rejected(self):
        response = self.client.post(
            self.url,
            self.payload,
            format="json",
        )

        self.assertEqual(response.status_code, 401)

    def test_regular_user_is_forbidden(self):
        token = RefreshToken.for_user(self.regular_user).access_token
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {token}"
        )

        response = self.client.post(
            self.url,
            self.payload,
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_admin_can_access_recommendation_endpoint(self):
        token = RefreshToken.for_user(self.admin_user).access_token
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {token}"
        )

        response = self.client.post(
            self.url,
            self.payload,
            format="json",
        )

        # A valid admin request may succeed or return a controlled
        # validation/business error, but must not be denied by permissions.
        self.assertNotIn(response.status_code, (401, 403))
