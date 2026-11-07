from django.urls import path
from .views import (
    SMSHistoryView,
    SMSPatientsView,
    SMSRemindersView,
    SMSTestView,
    SMSBulkSendView,
)

urlpatterns = [
    path("history/", SMSHistoryView.as_view(), name="sms-history"),
    path("test/", SMSTestView.as_view(), name="sms-test"),
    path("patients/", SMSPatientsView.as_view(), name="sms-patients"),
    path(
        "reminders/",
        SMSRemindersView.as_view(),
        name="sms-reminders",
    ),
    path("bulk/", SMSBulkSendView.as_view(), name="sms-bulk"),
]
