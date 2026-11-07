
import base64
import hashlib
import logging
import secrets
from datetime import date, timedelta
from email.message import EmailMessage

from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.utils import timezone

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from email_center.views import get_gmail_service
from schedules.models import Schedule

from .authentication import PatientJWTAuthentication
from .models import Patient, PatientMedicalProfile, PatientPasswordResetToken
from .serializers import (
    PatientMedicalProfileSerializer,
    PatientSerializer,
)

logger = logging.getLogger(__name__)



class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.all().order_by("-id")
    serializer_class = PatientSerializer
    permission_classes = [IsAdminUser]

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        # Determine whether the administrator selected portal access.
        raw_portal_option = request.data.get(
            "create_portal_account",
            False,
        )

        if isinstance(raw_portal_option, bool):
            create_portal_account = raw_portal_option
        elif isinstance(raw_portal_option, str):
            normalized_option = raw_portal_option.strip().lower()

            if normalized_option not in {
                "true", "false", "1", "0", "yes", "no", "on", "off",
            }:
                return Response(
                    {"error": "Invalid portal account option."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            create_portal_account = normalized_option in {
                "true", "1", "yes", "on",
            }
        else:
            return Response(
                {"error": "Invalid portal account option."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Portal accounts require an email and an active patient.
        if create_portal_account:
            email = request.data.get("email", "")

            if not isinstance(email, str) or not email.strip():
                return Response(
                    {
                        "error": (
                            "An email address is required to create "
                            "a Patient Portal account."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            patient_status = request.data.get("status", "Active")

            if patient_status != "Active":
                return Response(
                    {
                        "error": (
                            "Only active patients can receive a "
                            "Patient Portal account setup link."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Validate and create the patient profile.
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        patient = serializer.save()

        portal_account = {
            "created": False,
            "username": patient.patient_id,
            "setup_url": None,
            "expires_at": None,
        }

        if create_portal_account:
            # Generate a cryptographically secure, single-use token.
            raw_token = secrets.token_urlsafe(32)

            token_hash = hashlib.sha256(
                raw_token.encode("utf-8")
            ).hexdigest()

            now = timezone.now()
            expires_at = now + timedelta(hours=24)

            # Revoke previous unused setup/reset links for this patient.
            PatientPasswordResetToken.objects.filter(
                patient=patient,
                used_at__isnull=True,
            ).update(used_at=now)

            # Store only the token hash, never the raw token.
            PatientPasswordResetToken.objects.create(
                patient=patient,
                token_hash=token_hash,
                expires_at=expires_at,
                created_by=request.user,
            )

            setup_url = (
                f"{settings.FRONTEND_URL.rstrip('/')}"
                f"/patient/reset-password?token={raw_token}"
            )

            portal_account = {
                "created": True,
                "username": patient.patient_id,
                "setup_url": setup_url,
                "expires_at": expires_at.isoformat(),
            }

        # Keep the regular patient serializer response intact and add
        # portal_account metadata for the Add Patient modal.
        response_data = {
            **serializer.data,
            "portal_account": portal_account,
        }

        headers = self.get_success_headers(serializer.data)

        return Response(
            response_data,
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    @action(detail=True, methods=["get"])
    def medical_profile(self, request, pk=None):
        patient = self.get_object()

        try:
            profile = patient.medical_profile
            serializer = PatientMedicalProfileSerializer(profile)
            return Response(serializer.data)
        except PatientMedicalProfile.DoesNotExist:
            return Response(
                {},
                status=status.HTTP_404_NOT_FOUND,
            )



class PatientMedicalProfileViewSet(viewsets.ModelViewSet):
    queryset = PatientMedicalProfile.objects.all()
    serializer_class = PatientMedicalProfileSerializer


class PatientLoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        patient_id = request.data.get("patient_id")
        password = request.data.get("password")

        if not patient_id or not password:
            return Response(
                {"error": "Patient ID and Password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            patient = Patient.objects.get(
                patient_id=patient_id,
                status="Active",
            )
        except Patient.DoesNotExist:
            return Response(
                {"error": "Invalid Patient ID or Password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Never print submitted passwords or stored password hashes.
        if not patient.check_password(password):
            return Response(
                {"error": "Invalid Patient ID or Password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken()
        refresh["patient_id"] = patient.id
        refresh["role"] = "patient"

        return Response({
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "patient": {
                "id": patient.id,
                "patient_id": patient.patient_id,
                "first_name": patient.first_name,
                "last_name": patient.last_name,
            },
        })


class PatientDashboardView(APIView):
    authentication_classes = [PatientJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        patient = request.user

        today_schedule = (
            Schedule.objects
            .select_related("machine", "staff")
            .filter(
                patient=patient,
                dialysis_date=date.today(),
            )
            .first()
        )

        upcoming = (
            Schedule.objects
            .select_related("machine", "staff")
            .filter(
                patient=patient,
                dialysis_date__gt=date.today(),
            )
            .order_by("dialysis_date")[:5]
        )

        return Response({
            "patient": {
                "first_name": patient.first_name,
                "last_name": patient.last_name,
                "patient_id": patient.patient_id,
            },
            "today_schedule": None if not today_schedule else {
                "dialysis_date": today_schedule.dialysis_date,
                "dialysis_time": today_schedule.dialysis_time,
                "shift": today_schedule.shift,
                "machine": (
                    today_schedule.machine.machine_number
                    if today_schedule.machine else None
                ),
                "staff": (
                    f"{today_schedule.staff.first_name} "
                    f"{today_schedule.staff.last_name}"
                    if today_schedule.staff else None
                ),
                "status": today_schedule.status,
            },
            "upcoming": [
                {
                    "id": schedule.id,
                    "dialysis_date": schedule.dialysis_date,
                    "dialysis_time": schedule.dialysis_time,
                    "shift": schedule.shift,
                    "machine": (
                        schedule.machine.machine_number
                        if schedule.machine else None
                    ),
                    "staff": (
                        f"{schedule.staff.first_name} "
                        f"{schedule.staff.last_name}"
                        if schedule.staff else None
                    ),
                    "status": schedule.status,
                }
                for schedule in upcoming
            ],
        })


class PatientProfileView(APIView):
    authentication_classes = [PatientJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        patient = request.user

        try:
            profile = patient.medical_profile
        except PatientMedicalProfile.DoesNotExist:
            profile = None

        return Response({
            "personal": {
                "patient_id": patient.patient_id,
                "first_name": patient.first_name,
                "middle_name": patient.middle_name,
                "last_name": patient.last_name,
                "age": patient.age,
                "gender": patient.gender,
                "blood_type": patient.blood_type,
                "contact_number": patient.contact_number,
                "email": patient.email,
                "address": patient.address,
            },
            "medical": None if profile is None else {
                "weight": profile.weight,
                "dialysis_frequency": profile.dialysis_frequency,
                "dialysis_duration": profile.dialysis_duration,
                "preferred_shift": profile.preferred_shift,
                "diabetes": profile.diabetes,
                "hypertension": profile.hypertension,
                "vascular_access": profile.vascular_access,
            },
        })


class PatientScheduleView(APIView):
    authentication_classes = [PatientJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        schedules = (
            Schedule.objects
            .select_related("machine", "staff")
            .filter(patient=request.user)
            .order_by("dialysis_date")
        )

        return Response([
            {
                "id": schedule.id,
                "dialysis_date": schedule.dialysis_date,
                "dialysis_time": schedule.dialysis_time,
                "shift": schedule.shift,
                "machine": (
                    schedule.machine.machine_number
                    if schedule.machine else None
                ),
                "staff": (
                    f"{schedule.staff.first_name} "
                    f"{schedule.staff.last_name}"
                    if schedule.staff else None
                ),
                "status": schedule.status,
            }
            for schedule in schedules
        ])


class PatientHistoryView(APIView):
    authentication_classes = [PatientJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        history = (
            Schedule.objects
            .select_related("machine", "staff")
            .filter(
                patient=request.user,
                status="Completed",
            )
            .order_by("-dialysis_date")
        )

        return Response([
            {
                "id": schedule.id,
                "dialysis_date": schedule.dialysis_date,
                "dialysis_time": schedule.dialysis_time,
                "shift": schedule.shift,
                "machine": (
                    schedule.machine.machine_number
                    if schedule.machine else None
                ),
                "staff": (
                    f"{schedule.staff.first_name} "
                    f"{schedule.staff.last_name}"
                    if schedule.staff else None
                ),
            }
            for schedule in history
        ])


class PatientAccountCredentialsView(APIView):
    """
    Allows administrators to update a patient's Patient ID and,
    optionally, their password.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        user = request.user

        if not (
            getattr(user, "is_staff", False)
            or getattr(user, "is_superuser", False)
        ):
            return Response(
                {"error": "Administrator access is required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        new_patient_id = request.data.get("patient_id")
        new_password = request.data.get("password", "")
        confirm_password = request.data.get("confirm_password", "")

        if not isinstance(new_patient_id, str) or not new_patient_id.strip():
            return Response(
                {"error": "Patient ID is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        new_patient_id = new_patient_id.strip()

        if len(new_patient_id) > 20:
            return Response(
                {"error": "Patient ID must not exceed 20 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_password:
            if not isinstance(new_password, str):
                return Response(
                    {"error": "Password must be a string."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if len(new_password) < 8:
                return Response(
                    {"error": "The new password must be at least 8 characters."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if new_password != confirm_password:
                return Response(
                    {"error": "The passwords do not match."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        elif confirm_password:
            return Response(
                {"error": "Enter a new password before confirming it."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            patient = Patient.objects.get(pk=pk)
        except Patient.DoesNotExist:
            return Response(
                {"error": "Patient not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if Patient.objects.filter(
            patient_id=new_patient_id
        ).exclude(pk=patient.pk).exists():
            return Response(
                {"error": "That Patient ID is already in use."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                patient.patient_id = new_patient_id

                if new_password:
                    patient.set_password(new_password)

                patient.save(
                    update_fields=["patient_id", "password", "updated_at"]
                )
        except IntegrityError:
            return Response(
                {"error": "That Patient ID is already in use."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({
            "success": True,
            "message": "Patient account credentials updated successfully.",
            "patient": {
                "id": patient.id,
                "patient_id": patient.patient_id,
                "first_name": patient.first_name,
                "last_name": patient.last_name,
                "password_updated": bool(new_password),
            },
        })


class PatientPasswordResetLinkView(APIView):
    """
    Admin-only endpoint that generates a single-use,
    24-hour patient password-reset link for manual sharing.
    """
    permission_classes = [IsAdminUser]

    def post(self, request, patient_id):
        try:
            patient = Patient.objects.get(pk=patient_id)
        except Patient.DoesNotExist:
            return Response(
                {"error": "Patient not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(
            raw_token.encode("utf-8")
        ).hexdigest()

        now = timezone.now()
        expires_at = now + timedelta(hours=24)

        with transaction.atomic():
            PatientPasswordResetToken.objects.filter(
                patient=patient,
                used_at__isnull=True,
            ).update(used_at=now)

            PatientPasswordResetToken.objects.create(
                patient=patient,
                token_hash=token_hash,
                expires_at=expires_at,
                created_by=request.user,
            )

        reset_url = (
            f"{settings.FRONTEND_URL.rstrip('/')}"
            f"/patient/reset-password?token={raw_token}"
        )

        full_name = " ".join(
            part for part in [
                patient.first_name or "",
                patient.middle_name or "",
                patient.last_name or "",
            ]
            if part
        )

        return Response({
            "message": "Password reset link generated successfully.",
            "reset_url": reset_url,
            "expires_at": expires_at.isoformat(),
            "patient": {
                "id": patient.pk,
                "patient_id": patient.patient_id,
                "name": full_name,
            },
        }, status=status.HTTP_201_CREATED)


class PatientForgotPasswordView(APIView):
    """
    Public endpoint for patient-initiated password reset.

    Sends a 24-hour, single-use reset link to the email registered
    on an active patient account. The response does not disclose
    whether a Patient ID or email address exists.
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    GENERIC_MESSAGE = (
        "If an active patient account matches that Patient ID and has "
        "a registered email address, a password reset email will be "
        "sent shortly. Please check your inbox."
    )

    def post(self, request):
        patient_id = request.data.get("patient_id", "")

        if not isinstance(patient_id, str):
            return Response(
                {"message": self.GENERIC_MESSAGE},
                status=status.HTTP_200_OK,
            )

        patient_id = patient_id.strip()

        if not patient_id or len(patient_id) > 100:
            return Response(
                {"message": self.GENERIC_MESSAGE},
                status=status.HTTP_200_OK,
            )

        # Basic per-IP rate limit: at most five attempts per 15 minutes.
        # Use a shared cache such as Redis for production deployments.
        remote_ip = request.META.get("REMOTE_ADDR", "unknown")
        ip_hash = hashlib.sha256(
            remote_ip.encode("utf-8")
        ).hexdigest()
        rate_key = f"patient-password-reset:ip:{ip_hash}"

        if not cache.add(rate_key, 1, timeout=900):
            try:
                request_count = cache.incr(rate_key)
            except ValueError:
                cache.set(rate_key, 2, timeout=900)
                request_count = 2
        else:
            request_count = 1

        if request_count > 5:
            return Response(
                {"message": self.GENERIC_MESSAGE},
                status=status.HTTP_200_OK,
            )

        patient = Patient.objects.filter(
            patient_id=patient_id,
            status="Active",
        ).first()

        if not patient or not (patient.email or "").strip():
            return Response(
                {"message": self.GENERIC_MESSAGE},
                status=status.HTTP_200_OK,
            )

        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(
            raw_token.encode("utf-8")
        ).hexdigest()

        now = timezone.now()
        expires_at = now + timedelta(hours=24)

        # Create the new token without revoking old links yet.
        # If email sending fails, the previous link remains usable.
        try:
            reset_token = PatientPasswordResetToken.objects.create(
                patient=patient,
                token_hash=token_hash,
                expires_at=expires_at,
            )

            reset_url = (
                f"{settings.FRONTEND_URL.rstrip('/')}"
                f"/patient/reset-password?token={raw_token}"
            )

            full_name = " ".join(
                part for part in [
                    patient.first_name or "",
                    patient.middle_name or "",
                    patient.last_name or "",
                ]
                if part
            ) or "Patient"

            email_body = (
                f"Hello {full_name},\n\n"
                "We received a request to reset the password for your "
                "AI Dialysis Patient Portal account.\n\n"
                "Use the secure link below to choose a new password:\n\n"
                f"{reset_url}\n\n"
                "This link expires in 24 hours and can only be used once.\n\n"
                "If you did not request this change, you can ignore this "
                "email. Your current password will remain unchanged.\n\n"
                "AI Dialysis System\n"
                "Patient Portal"
            )

            email = EmailMessage()
            email["To"] = patient.email.strip()
            email["Subject"] = (
                "Reset Your AI Dialysis Patient Portal Password"
            )
            email.set_content(email_body)

            raw_message = base64.urlsafe_b64encode(
                email.as_bytes()
            ).decode("utf-8")

            gmail_service = get_gmail_service()
            gmail_service.users().messages().send(
                userId="me",
                body={"raw": raw_message},
            ).execute()

            # Revoke previous unused links only after Gmail accepts
            # the new email request.
            with transaction.atomic():
                PatientPasswordResetToken.objects.filter(
                    patient=patient,
                    used_at__isnull=True,
                ).exclude(
                    pk=reset_token.pk,
                ).update(used_at=timezone.now())

            logger.info(
                "Patient password-reset email submitted successfully."
            )

        except Exception:
            logger.exception(
                "Unable to process a patient password-reset email."
            )

            # Invalidate the new token if it was created but sending
            # or subsequent processing failed.
            try:
                PatientPasswordResetToken.objects.filter(
                    token_hash=token_hash,
                    used_at__isnull=True,
                ).update(used_at=timezone.now())
            except Exception:
                logger.exception(
                    "Unable to invalidate the unsent password-reset token."
                )

        return Response(
            {"message": self.GENERIC_MESSAGE},
            status=status.HTTP_200_OK,
        )


class PatientPasswordResetView(APIView):
    """
    Public endpoint used by patients to validate a reset link
    and set their own password.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def get_valid_token(self, raw_token, lock=False):
        if not raw_token or not isinstance(raw_token, str):
            return None

        token_hash = hashlib.sha256(
            raw_token.encode("utf-8")
        ).hexdigest()

        queryset = PatientPasswordResetToken.objects.select_related(
            "patient"
        )

        if lock:
            queryset = queryset.select_for_update()

        try:
            reset_token = queryset.get(token_hash=token_hash)
        except PatientPasswordResetToken.DoesNotExist:
            return None

        if reset_token.used_at is not None:
            return None

        if reset_token.expires_at <= timezone.now():
            return None

        return reset_token

    def get(self, request):
        reset_token = self.get_valid_token(
            request.query_params.get("token")
        )

        if not reset_token:
            return Response(
                {
                    "valid": False,
                    "error": (
                        "This password reset link is invalid, expired, "
                        "or already used."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        patient = reset_token.patient
        patient_name = " ".join(
            part for part in [
                patient.first_name or "",
                patient.middle_name or "",
                patient.last_name or "",
            ]
            if part
        )

        return Response({
            "valid": True,
            "purpose": "setup" if not patient.password else "reset",
            "patient_name": patient_name,
            "expires_at": reset_token.expires_at.isoformat(),
        })

    def post(self, request):
        raw_token = request.data.get("token", "")
        password = request.data.get("password", "")
        confirm_password = request.data.get("confirm_password", "")

        if not raw_token:
            return Response(
                {"error": "A password reset token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not isinstance(password, str) or len(password) < 8:
            return Response(
                {"error": "Password must be at least 8 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if password != confirm_password:
            return Response(
                {"error": "The passwords do not match."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            reset_token = self.get_valid_token(
                raw_token,
                lock=True,
            )

            if not reset_token:
                return Response(
                    {
                        "error": (
                            "This password reset link is invalid, expired, "
                            "or already used."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            patient = reset_token.patient
            patient.password = make_password(password)
            patient.save(update_fields=["password"])

            reset_token.used_at = timezone.now()
            reset_token.save(update_fields=["used_at"])

        return Response({
            "message": (
                "Your password has been changed successfully. "
                "You can now log in."
            )
        }, status=status.HTTP_200_OK)
