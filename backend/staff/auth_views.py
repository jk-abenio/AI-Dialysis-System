
from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken


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
