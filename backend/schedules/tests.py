
from datetime import date, time, timedelta

from django.test import TestCase

from patients.models import Patient, PatientMedicalProfile
from machines.models import Machine
from staff.models import Staff
from .models import Schedule
from .serializers import ScheduleSerializer


class ScheduleOverlapValidationTests(TestCase):
    def setUp(self):
        self.patient = Patient.objects.create(
            first_name="Test",
            last_name="Patient",
            patient_id="TEST001",
            birth_date=date(1990, 1, 1),
            gender="Male",
            blood_type="O+",
            contact_number="09170000001",
            address="Test Address",
            emergency_contact="Test Contact",
        )

        PatientMedicalProfile.objects.create(
            patient=self.patient,
            weight=70,
            dialysis_frequency="3x/week",
            dialysis_duration=2.0,
            preferred_shift="Morning",
            vascular_access="AV Fistula",
        )

        self.other_patient = Patient.objects.create(
            first_name="Other",
            last_name="Patient",
            patient_id="TEST002",
            birth_date=date(1991, 1, 1),
            gender="Female",
            blood_type="A+",
            contact_number="09170000002",
            address="Test Address",
            emergency_contact="Test Contact",
        )

        PatientMedicalProfile.objects.create(
            patient=self.other_patient,
            weight=65,
            dialysis_frequency="3x/week",
            dialysis_duration=2.0,
            preferred_shift="Morning",
            vascular_access="AV Fistula",
        )

        self.machine = Machine.objects.create(
            machine_number="TEST-M01",
            machine_code="TEST-C01",
            brand="Test Brand",
            location="Test Room",
        )

        self.other_machine = Machine.objects.create(
            machine_number="TEST-M02",
            machine_code="TEST-C02",
            brand="Test Brand",
            location="Test Room",
        )

        self.staff = Staff.objects.create(
            employee_id="TEST-S01",
            first_name="Test",
            last_name="Nurse",
            contact_number="09170000003",
            email="test.nurse@example.com",
        )

        self.other_staff = Staff.objects.create(
            employee_id="TEST-S02",
            first_name="Other",
            last_name="Nurse",
            contact_number="09170000004",
            email="other.nurse@example.com",
        )

        self.booking_date = date.today() + timedelta(days=10)

    def create_schedule(
        self,
        *,
        patient=None,
        machine=None,
        staff=None,
        start_time=time(8, 0),
        status="Scheduled",
    ):
        return Schedule.objects.create(
            patient=patient or self.patient,
            machine=machine or self.machine,
            staff=staff or self.staff,
            dialysis_date=self.booking_date,
            dialysis_time=start_time,
            shift="Morning",
            status=status,
        )

    def make_payload(
        self,
        patient=None,
        machine=None,
        staff=None,
        start_time=time(9, 0),
        status="Scheduled",
        shift="Morning",
    ):
        return {
            "patient": (
                patient or self.other_patient
            ).pk,
            "machine": (
                machine or self.other_machine
            ).pk,
            "staff": (
                staff or self.other_staff
            ).pk,
            "dialysis_date": self.booking_date.isoformat(),
            "dialysis_time": start_time.strftime("%H:%M:%S"),
            "shift": shift,
            "status": status,
            "notes": "",
        }

    # Appointment overlap tests

    def test_rejects_overlapping_patient_booking(self):
        self.create_schedule()

        payload = self.make_payload(
            patient=self.patient,
            machine=self.other_machine,
            staff=self.other_staff,
            start_time=time(9, 0),
        )

        serializer = ScheduleSerializer(data=payload)

        self.assertFalse(serializer.is_valid())
        self.assertIn("patient", serializer.errors)

    def test_rejects_overlapping_machine_booking(self):
        self.create_schedule()

        payload = self.make_payload(
            patient=self.other_patient,
            machine=self.machine,
            staff=self.other_staff,
            start_time=time(9, 0),
        )

        serializer = ScheduleSerializer(data=payload)

        self.assertFalse(serializer.is_valid())
        self.assertIn("machine", serializer.errors)

    def test_rejects_overlapping_staff_booking(self):
        self.create_schedule()

        payload = self.make_payload(
            patient=self.other_patient,
            machine=self.other_machine,
            staff=self.staff,
            start_time=time(9, 0),
        )

        serializer = ScheduleSerializer(data=payload)

        self.assertFalse(serializer.is_valid())
        self.assertIn("staff", serializer.errors)

    def test_allows_booking_after_existing_session_ends(self):
        self.create_schedule()

        payload = self.make_payload(start_time=time(10, 0))
        serializer = ScheduleSerializer(data=payload)

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_cancelled_schedule_does_not_block_booking(self):
        self.create_schedule(status="Cancelled")

        payload = self.make_payload(start_time=time(9, 0))
        serializer = ScheduleSerializer(data=payload)

        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_updating_schedule_does_not_conflict_with_itself(self):
        schedule = self.create_schedule()

        payload = {
            "dialysis_time": "08:30:00",
        }

        serializer = ScheduleSerializer(
            schedule,
            data=payload,
            partial=True,
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)

    # Machine and staff eligibility tests

    def test_rejects_machine_in_use(self):
        self.machine.status = "In Use"
        self.machine.save()

        serializer = ScheduleSerializer(
            data=self.make_payload(machine=self.machine)
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("machine", serializer.errors)

    def test_rejects_machine_under_maintenance(self):
        self.machine.status = "Maintenance"
        self.machine.save()

        serializer = ScheduleSerializer(
            data=self.make_payload(machine=self.machine)
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("machine", serializer.errors)

    def test_rejects_staff_on_leave(self):
        self.staff.status = "On Leave"
        self.staff.save()

        serializer = ScheduleSerializer(
            data=self.make_payload(staff=self.staff)
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("staff", serializer.errors)

    def test_rejects_inactive_staff(self):
        self.staff.status = "Inactive"
        self.staff.save()

        serializer = ScheduleSerializer(
            data=self.make_payload(staff=self.staff)
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("staff", serializer.errors)

    def test_rejects_technician_as_assigned_staff(self):
        self.staff.role = "Technician"
        self.staff.save()

        serializer = ScheduleSerializer(
            data=self.make_payload(staff=self.staff)
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("staff", serializer.errors)

    def test_allows_active_head_nurse(self):
        self.staff.role = "Head Nurse"
        self.staff.status = "Active"
        self.staff.save()

        serializer = ScheduleSerializer(
            data=self.make_payload(staff=self.staff)
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)

    # Shift validation tests

    def test_rejects_treatment_crossing_shift_boundary(self):
        # A 2-hour treatment starting at 11:00 AM ends at 1:00 PM.
        serializer = ScheduleSerializer(
            data=self.make_payload(
                start_time=time(11, 0),
                shift="Morning",
            )
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("dialysis_time", serializer.errors)

    def test_rejects_appointment_outside_operating_hours(self):
        serializer = ScheduleSerializer(
            data=self.make_payload(
                start_time=time(22, 0),
                shift="Evening",
            )
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("dialysis_time", serializer.errors)

    def test_rejects_wrong_shift_for_appointment_time(self):
        serializer = ScheduleSerializer(
            data=self.make_payload(
                start_time=time(13, 0),
                shift="Morning",
            )
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("shift", serializer.errors)

    def test_accepts_treatment_fitting_within_shift(self):
        serializer = ScheduleSerializer(
            data=self.make_payload(
                start_time=time(8, 0),
                shift="Morning",
            )
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
