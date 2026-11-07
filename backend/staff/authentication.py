
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed


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
