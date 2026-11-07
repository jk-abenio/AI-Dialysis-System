
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, IsAdminUser

from .serializers import (
    RecommendationRequestSerializer,
    BookRecommendationSerializer,
)
from .services import (
    recommend_schedules,
    book_recommended_schedule,
)


class ScheduleRecommendationView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request):
        serializer = RecommendationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data

        result = recommend_schedules(
            patient_id=data["patient_id"],
            requested_date=data["requested_date"],
            requested_time=data.get("requested_time"),
        )

        response_status = (
            status.HTTP_200_OK
            if result["success"]
            else status.HTTP_400_BAD_REQUEST
        )

        return Response(result, status=response_status)


class BookRecommendedScheduleView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request):
        serializer = BookRecommendationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data

        result = book_recommended_schedule(
            patient_id=data["patient_id"],
            requested_date=data["requested_date"],
            requested_time=data["requested_time"],
            machine_id=data["machine_id"],
            staff_id=data["staff_id"],
            notes=data.get("notes", ""),
        )

        response_status = (
            status.HTTP_201_CREATED
            if result["success"]
            else status.HTTP_400_BAD_REQUEST
        )

        return Response(result, status=response_status)
