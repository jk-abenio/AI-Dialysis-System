
from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model, password_validation
from django.core import signing
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction

from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import (
    NotFound,
    PermissionDenied,
    ValidationError,
)
from rest_framework.permissions import (
    AllowAny,
    BasePermission,
)
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed

from .models import Staff
from .serializers import StaffSerializer
from .authentication import StaffJWTAuthentication


# ============================================================
# TOKEN CONFIGURATION
# ============================================================

SETUP_TOKEN_SALT = "staff-account-setup"
SETUP_TOKEN_MAX_AGE = 60 * 60 * 24  # 24 hours

RESET_TOKEN_SALT = "staff-password-reset"
RESET_TOKEN_MAX_AGE = 60 * 60 * 24  # 24 hours


# ============================================================
# URL BUILDERS
# ============================================================

def build_staff_setup_url(staff_profile, user):
    """Generate a password setup URL valid for 24 hours."""
    token = signing.dumps(
        {
            "staff_id": staff_profile.pk,
            "user_id": user.pk,
        },
        salt=SETUP_TOKEN_SALT,
    )

    frontend_url = getattr(
        settings,
        "FRONTEND_URL",
        "http://localhost:5173",
    ).rstrip("/")

    return (
        f"{frontend_url}/staff/setup-password?"
        f"{urlencode({'token': token})}"
    )


def build_staff_reset_url(staff_profile, user):
    """
    Generate a password-reset URL valid for 24 hours.

    The current password hash is included in the signed payload.
    After the password changes, the old link becomes invalid.
    """
    token = signing.dumps(
        {
            "staff_id": staff_profile.pk,
            "user_id": user.pk,
            "password_hash": user.password,
        },
        salt=RESET_TOKEN_SALT,
    )

    frontend_url = getattr(
        settings,
        "FRONTEND_URL",
        "http://localhost:5173",
    ).rstrip("/")

    return (
        f"{frontend_url}/staff/reset-password?"
        f"{urlencode({'token': token})}"
    )


# ============================================================
# STAFF ACCOUNT CREATION
# ============================================================

def create_staff_portal_user(staff_profile):
    """
    Create a portal account for an active staff profile.

    The account is active, but its password is initially unusable.
    The staff member must complete password setup before logging in.
    """
    User = get_user_model()

    if staff_profile.status != "Active":
        raise ValidationError(
            "Only active staff members can receive portal accounts."
        )

    if staff_profile.user_id:
        raise ValidationError(
            "This staff profile already has a linked portal account."
        )

    username = (staff_profile.employee_id or "").strip()

    if not username:
        raise ValidationError(
            "The staff member needs an employee ID."
        )

    if User.objects.filter(username=username).exists():
        raise ValidationError({
            "employee_id": (
                "This employee ID is already used as a username. "
                "Resolve the conflict before creating the account."
            )
        })

    user = User(
        username=username,
        email=staff_profile.email,
        first_name=staff_profile.first_name,
        last_name=staff_profile.last_name,
        is_active=True,
        is_staff=False,
        is_superuser=False,
    )
    user.set_unusable_password()
    user.save()

    staff_profile.user = user
    staff_profile.save(update_fields=["user"])

    return user


# ============================================================
# PERMISSIONS
# ============================================================

class IsAdminUserOnly(BasePermission):
    """Only active Django administrators can manage staff accounts."""

    def has_permission(self, request, view):
        user = request.user

        return bool(
            user
            and user.is_authenticated
            and user.is_active
            and (user.is_staff or user.is_superuser)
        )


class IsStaffPortalUser(BasePermission):
    """Allow access only to users linked to an active staff profile."""

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated or not user.is_active:
            return False

        try:
            staff_profile = user.staff_profile
        except Staff.DoesNotExist:
            return False

        return staff_profile.status == "Active"


# ============================================================
# STAFF VIEWSET
# ============================================================

class StaffViewSet(viewsets.ModelViewSet):
    queryset = Staff.objects.all()
    serializer_class = StaffSerializer
    permission_classes = [IsAdminUserOnly]

    def get_permissions(self):
        action_name = getattr(self, "action", None)

        # These endpoints use signed tokens and do not require login.
        if action_name in (
            "setup_password",
            "validate_setup_token",
            "reset_password",
            "validate_reset_token",
        ):
            return [AllowAny()]

        # Staff can access their own profile endpoint.
        if action_name == "me":
            return [IsStaffPortalUser()]

        # Staff management and link generation remain admin-only.
        return [IsAdminUserOnly()]

    def get_queryset(self):
        """
        Administrators see all staff profiles.
        Staff users see only their own profile.
        """
        queryset = Staff.objects.all()
        user = self.request.user

        if not user or not user.is_authenticated:
            return queryset.none()

        if user.is_staff or user.is_superuser:
            return queryset

        try:
            staff_profile = user.staff_profile
        except Staff.DoesNotExist:
            return queryset.none()

        if staff_profile.status != "Active":
            return queryset.none()

        return queryset.filter(pk=staff_profile.pk)

    # --------------------------------------------------------
    # CREATE STAFF PROFILE
    # --------------------------------------------------------

    def create(self, request, *args, **kwargs):
        """
        POST /api/staff/

        Optional request field:
            create_portal_account: true or false

        When true, create the staff profile and portal account
        in one transaction and return a setup link.
        """
        create_portal_account = request.data.get(
            "create_portal_account",
            False,
        )

        if isinstance(create_portal_account, str):
            create_portal_account = (
                create_portal_account.strip().lower()
                in ("true", "1", "yes", "on")
            )
        else:
            create_portal_account = bool(create_portal_account)

        staff_data = request.data.copy()
        staff_data.pop("create_portal_account", None)

        serializer = self.get_serializer(data=staff_data)
        serializer.is_valid(raise_exception=True)

        if (
            create_portal_account
            and serializer.validated_data.get("status", "Active") != "Active"
        ):
            raise ValidationError({
                "status": (
                    "Only active staff members can receive portal accounts."
                )
            })

        with transaction.atomic():
            staff_profile = serializer.save()
            response_data = self.get_serializer(staff_profile).data

            if create_portal_account:
                user = create_staff_portal_user(staff_profile)
                setup_url = build_staff_setup_url(staff_profile, user)

                response_data["portal_account"] = {
                    "created": True,
                    "username": user.get_username(),
                    "setup_url": setup_url,
                    "expires_in_hours": 24,
                }

                response_data["setup_url"] = setup_url
                response_data["username"] = user.get_username()
                response_data["expires_in_hours"] = 24

        headers = self.get_success_headers(serializer.data)

        return Response(
            response_data,
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    # --------------------------------------------------------
    # CURRENT STAFF PROFILE
    # --------------------------------------------------------

    @action(
        detail=False,
        methods=["get"],
        url_path="me",
        authentication_classes=[StaffJWTAuthentication],
    )
    def me(self, request):
        """GET /api/staff/me/"""

        try:
            staff_profile = request.user.staff_profile
        except Staff.DoesNotExist:
            raise PermissionDenied(
                "Your account is not linked to a staff profile."
            )

        if staff_profile.status != "Active":
            raise PermissionDenied("Your staff profile is not active.")

        return Response({
            "success": True,
            "staff": self.get_serializer(staff_profile).data,
        })

    # --------------------------------------------------------
    # CREATE OR PREPARE ACCOUNT SETUP LINK
    # --------------------------------------------------------

    @action(
        detail=True,
        methods=["post"],
        url_path="create-account",
    )
    def create_account(self, request, pk=None):
        """
        POST /api/staff/<id>/create-account/

        Creates a portal account if one does not exist, or generates
        a setup link for an existing account without a usable password.

        Activated accounts must use the separate reset-password flow.
        """
        User = get_user_model()

        with transaction.atomic():
            try:
                staff_profile = Staff.objects.select_for_update().get(
                    pk=pk
                )
            except Staff.DoesNotExist:
                raise NotFound("Staff member not found.")

            if staff_profile.status != "Active":
                raise ValidationError(
                    "Only active staff members can receive accounts."
                )

            if staff_profile.user_id:
                try:
                    user = User.objects.select_for_update().get(
                        pk=staff_profile.user_id
                    )
                except User.DoesNotExist:
                    raise ValidationError(
                        "The linked user account could not be found."
                    )

                if not user.is_active:
                    raise ValidationError(
                        "The linked account is inactive. An administrator "
                        "must review it before generating a setup link."
                    )

                if user.has_usable_password():
                    raise ValidationError(
                        "This staff account has already been activated. "
                        "Use the password-reset link option instead."
                    )
            else:
                user = create_staff_portal_user(staff_profile)

            setup_url = build_staff_setup_url(staff_profile, user)

        return Response(
            {
                "success": True,
                "message": (
                    "Staff account is ready for password setup. "
                    "The link expires in 24 hours."
                ),
                "username": user.get_username(),
                "setup_url": setup_url,
                "expires_in_hours": 24,
            },
            status=status.HTTP_201_CREATED,
        )

    # --------------------------------------------------------
    # GENERATE PASSWORD-RESET LINK FOR ACTIVATED ACCOUNTS
    # --------------------------------------------------------

    @action(
        detail=True,
        methods=["post"],
        url_path="reset-password-link",
    )
    def reset_password_link(self, request, pk=None):
        """
        POST /api/staff/<id>/reset-password-link/

        Administrator-only endpoint for activated staff accounts.
        Does not change the current password.
        """
        User = get_user_model()

        with transaction.atomic():
            try:
                staff_profile = Staff.objects.select_for_update().get(
                    pk=pk
                )
            except Staff.DoesNotExist:
                raise NotFound("Staff member not found.")

            if staff_profile.status != "Active":
                raise ValidationError(
                    "Only active staff members can reset their passwords."
                )

            if not staff_profile.user_id:
                raise ValidationError(
                    "This staff member has no linked portal account. "
                    "Generate an account setup link first."
                )

            try:
                user = User.objects.select_for_update().get(
                    pk=staff_profile.user_id
                )
            except User.DoesNotExist:
                raise ValidationError(
                    "The linked user account could not be found."
                )

            if not user.is_active:
                raise ValidationError(
                    "The linked account is inactive. An administrator "
                    "must review it before resetting the password."
                )

            if not user.has_usable_password():
                raise ValidationError(
                    "This account has not been activated yet. "
                    "Use the account setup link instead."
                )

            reset_url = build_staff_reset_url(staff_profile, user)

        return Response(
            {
                "success": True,
                "message": (
                    "Password-reset link generated. "
                    "It expires in 24 hours and can be used once."
                ),
                "username": user.get_username(),
                "reset_url": reset_url,
                "expires_in_hours": 24,
            },
            status=status.HTTP_200_OK,
        )

    # --------------------------------------------------------
    # INITIAL PASSWORD SETUP
    # --------------------------------------------------------

    @action(
        detail=False,
        methods=["post"],
        url_path="setup-password",
        authentication_classes=[],
        permission_classes=[AllowAny],
    )
    def setup_password(self, request):
        """
        POST /api/staff/setup-password/

        JSON:
        {
            "token": "...",
            "password": "...",
            "confirm_password": "..."
        }
        """
        token = request.data.get("token", "")
        password = request.data.get("password", "")
        confirm_password = request.data.get("confirm_password", "")

        if not all(
            isinstance(value, str) and value
            for value in (token, password, confirm_password)
        ):
            raise ValidationError(
                "Token, password, and password confirmation are required."
            )

        if password != confirm_password:
            raise ValidationError({
                "confirm_password": "The passwords do not match."
            })

        try:
            payload = signing.loads(
                token,
                salt=SETUP_TOKEN_SALT,
                max_age=SETUP_TOKEN_MAX_AGE,
            )
        except signing.SignatureExpired:
            raise ValidationError(
                "This setup link has expired. Ask an administrator "
                "to generate a new one."
            )
        except signing.BadSignature:
            raise ValidationError(
                "This setup link is invalid. Request a new link."
            )

        User = get_user_model()

        with transaction.atomic():
            try:
                user = User.objects.select_for_update().get(
                    pk=payload["user_id"]
                )

                staff_profile = Staff.objects.select_for_update().get(
                    pk=payload["staff_id"],
                    user_id=user.pk,
                )
            except (
                User.DoesNotExist,
                Staff.DoesNotExist,
                KeyError,
                TypeError,
            ):
                raise ValidationError(
                    "This setup link is no longer valid."
                )

            if not user.is_active or staff_profile.status != "Active":
                raise ValidationError("This staff account is inactive.")

            if user.has_usable_password():
                raise ValidationError(
                    "This setup link has already been used."
                )

            try:
                password_validation.validate_password(password, user)
            except DjangoValidationError as exc:
                raise ValidationError({
                    "password": list(exc.messages)
                })

            user.set_password(password)
            user.save(update_fields=["password"])

        return Response({
            "success": True,
            "message": (
                "Password set successfully. You can now sign in "
                "through the Staff Portal."
            ),
        })

    # --------------------------------------------------------
    # VALIDATE INITIAL SETUP TOKEN
    # --------------------------------------------------------

    @action(
        detail=False,
        methods=["post"],
        url_path="validate-setup-token",
        permission_classes=[AllowAny],
        authentication_classes=[],
    )
    def validate_setup_token(self, request):
        token = request.data.get("token", "")

        if not isinstance(token, str) or not token:
            return Response(
                {
                    "valid": False,
                    "message": "No setup link was provided.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            payload = signing.loads(
                token,
                salt=SETUP_TOKEN_SALT,
                max_age=SETUP_TOKEN_MAX_AGE,
            )
        except signing.SignatureExpired:
            return Response({
                "valid": False,
                "message": (
                    "This setup link has expired. "
                    "Please contact your administrator for a new link."
                ),
            })
        except signing.BadSignature:
            return Response({
                "valid": False,
                "message": (
                    "This setup link is invalid. "
                    "Please contact your administrator for a new link."
                ),
            })

        User = get_user_model()

        try:
            user = User.objects.get(pk=payload["user_id"])
            staff_profile = Staff.objects.get(
                pk=payload["staff_id"],
                user_id=user.pk,
            )
        except (
            User.DoesNotExist,
            Staff.DoesNotExist,
            KeyError,
            TypeError,
        ):
            return Response({
                "valid": False,
                "message": (
                    "This setup link is invalid or no longer available."
                ),
            })

        if not user.is_active or staff_profile.status != "Active":
            return Response({
                "valid": False,
                "message": (
                    "This staff account is inactive. "
                    "Please contact your administrator."
                ),
            })

        if user.has_usable_password():
            return Response({
                "valid": False,
                "message": (
                    "This setup link has already been used. "
                    "Please sign in or contact your administrator "
                    "if you need assistance."
                ),
            })

        return Response({
            "valid": True,
            "message": "This setup link is valid.",
        })

    # --------------------------------------------------------
    # RESET PASSWORD USING A RESET TOKEN
    # --------------------------------------------------------

    @action(
        detail=False,
        methods=["post"],
        url_path="reset-password",
        authentication_classes=[],
        permission_classes=[AllowAny],
    )
    def reset_password(self, request):
        """
        POST /api/staff/reset-password/

        JSON:
        {
            "token": "...",
            "password": "...",
            "confirm_password": "..."
        }
        """
        token = request.data.get("token", "")
        password = request.data.get("password", "")
        confirm_password = request.data.get("confirm_password", "")

        if not all(
            isinstance(value, str) and value
            for value in (token, password, confirm_password)
        ):
            raise ValidationError(
                "Token, password, and password confirmation are required."
            )

        if password != confirm_password:
            raise ValidationError({
                "confirm_password": "The passwords do not match."
            })

        try:
            payload = signing.loads(
                token,
                salt=RESET_TOKEN_SALT,
                max_age=RESET_TOKEN_MAX_AGE,
            )
        except signing.SignatureExpired:
            raise ValidationError(
                "This password-reset link has expired. "
                "Ask an administrator to generate a new one."
            )
        except signing.BadSignature:
            raise ValidationError(
                "This password-reset link is invalid. Request a new link."
            )

        User = get_user_model()

        with transaction.atomic():
            try:
                user = User.objects.select_for_update().get(
                    pk=payload["user_id"]
                )

                staff_profile = Staff.objects.select_for_update().get(
                    pk=payload["staff_id"],
                    user_id=user.pk,
                )
            except (
                User.DoesNotExist,
                Staff.DoesNotExist,
                KeyError,
                TypeError,
            ):
                raise ValidationError(
                    "This password-reset link is no longer valid."
                )

            if not user.is_active or staff_profile.status != "Active":
                raise ValidationError("This staff account is inactive.")

            # Changing the password invalidates the token.
            if payload.get("password_hash") != user.password:
                raise ValidationError(
                    "This password-reset link has already been used "
                    "or is no longer valid. Request a new link."
                )

            try:
                password_validation.validate_password(password, user)
            except DjangoValidationError as exc:
                raise ValidationError({
                    "password": list(exc.messages)
                })

            user.set_password(password)
            user.save(update_fields=["password"])

        return Response({
            "success": True,
            "message": (
                "Password reset successfully. "
                "You can now sign in through the Staff Portal."
            ),
        })

    # --------------------------------------------------------
    # VALIDATE PASSWORD-RESET TOKEN
    # --------------------------------------------------------

    @action(
        detail=False,
        methods=["post"],
        url_path="validate-reset-token",
        authentication_classes=[],
        permission_classes=[AllowAny],
    )
    def validate_reset_token(self, request):
        """
        POST /api/staff/validate-reset-token/

        JSON:
        {
            "token": "..."
        }
        """
        token = request.data.get("token", "")

        if not isinstance(token, str) or not token:
            return Response(
                {
                    "valid": False,
                    "message": "No password-reset link was provided.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            payload = signing.loads(
                token,
                salt=RESET_TOKEN_SALT,
                max_age=RESET_TOKEN_MAX_AGE,
            )
        except signing.SignatureExpired:
            return Response({
                "valid": False,
                "message": (
                    "This password-reset link has expired. "
                    "Contact your administrator for a new one."
                ),
            })
        except signing.BadSignature:
            return Response({
                "valid": False,
                "message": (
                    "This password-reset link is invalid. "
                    "Contact your administrator for a new one."
                ),
            })

        User = get_user_model()

        try:
            user = User.objects.get(pk=payload["user_id"])
            staff_profile = Staff.objects.get(
                pk=payload["staff_id"],
                user_id=user.pk,
            )
        except (
            User.DoesNotExist,
            Staff.DoesNotExist,
            KeyError,
            TypeError,
        ):
            return Response({
                "valid": False,
                "message": "This password-reset link is no longer valid.",
            })

        if not user.is_active or staff_profile.status != "Active":
            return Response({
                "valid": False,
                "message": "This staff account is inactive.",
            })

        if not user.has_usable_password():
            return Response({
                "valid": False,
                "message": (
                    "This account has not been activated. "
                    "Contact your administrator for an account setup link."
                ),
            })

        if payload.get("password_hash") != user.password:
            return Response({
                "valid": False,
                "message": (
                    "This password-reset link has already been used "
                    "or is no longer valid. Request a new link."
                ),
            })

        return Response({
            "valid": True,
            "message": "This password-reset link is valid.",
        })


# ============================================================
# STAFF LOGIN
# ============================================================

@api_view(["POST"])
@permission_classes([AllowAny])
def staff_login_view(request):
    username = request.data.get("username", "").strip()
    password = request.data.get("password", "")

    if not username or not password:
        return Response(
            {
                "success": False,
                "message": "Username and password are required.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = authenticate(username=username, password=password)

    if user is None or not user.is_active:
        return Response(
            {
                "success": False,
                "message": "Invalid username or password.",
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    try:
        staff_profile = user.staff_profile
    except Exception:
        return Response(
            {
                "success": False,
                "message": "This account is not linked to a staff profile.",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    if staff_profile.status != "Active":
        return Response(
            {
                "success": False,
                "message": "Your staff profile is not active.",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    refresh = RefreshToken.for_user(user)

    return Response(
        {
            "success": True,
            "message": "Staff login successful.",
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
            },
            "staff": {
                "id": staff_profile.id,
                "employee_id": staff_profile.employee_id,
                "first_name": staff_profile.first_name,
                "last_name": staff_profile.last_name,
                "role": staff_profile.role,
            },
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# STAFF JWT AUTHENTICATION
# ============================================================

class StaffJWTAuthentication(JWTAuthentication):
    """
    Authentication for Staff Portal API requests.

    Requires a valid Django JWT and an active, linked staff profile.
    Does not replace the project's default JWT authentication.
    """

    def authenticate(self, request):
        result = super().authenticate(request)

        if result is None:
            return None

        user, validated_token = result

        if not user.is_active:
            raise AuthenticationFailed("This account is inactive.")

        try:
            staff_profile = user.staff_profile
        except Exception:
            raise AuthenticationFailed(
                "This account is not linked to a staff profile."
            )

        if staff_profile.status != "Active":
            raise AuthenticationFailed(
                "Your staff profile is not active."
            )

        return user, validated_token
