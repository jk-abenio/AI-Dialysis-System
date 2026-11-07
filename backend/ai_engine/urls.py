from django.urls import path
from .views import (
    ScheduleRecommendationView,
    BookRecommendedScheduleView,
)

urlpatterns = [
    path(
        "recommendations/",
        ScheduleRecommendationView.as_view(),
        name="schedule-recommendations",
    ),
    path(
        "book/",
        BookRecommendedScheduleView.as_view(),
        name="book-recommended-schedule",
    ),
]