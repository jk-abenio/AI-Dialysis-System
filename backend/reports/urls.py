from django.urls import path

from .views import (
    DailyReportView,
    DailyReportPDFView,
    DailyReportExcelView,
)

urlpatterns = [

    path(
        "daily/",
        DailyReportView.as_view(),
    ),

    path(
        "daily/pdf/",
        DailyReportPDFView.as_view(),
    ),

    path("daily/excel/",
         DailyReportExcelView.as_view(),),

]