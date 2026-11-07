
from django.urls import path
from .views import (
    GmailOAuthStartView,
    GmailOAuthCallbackView,
    GmailInboxView,
    GmailMessageDetailView,
    GmailSendMessageView,
    GmailSentMessagesView,
    GmailAppointmentRemindersView,
)

urlpatterns = [
    # Google OAuth
    path(
        "oauth/start/",
        GmailOAuthStartView.as_view(),
        name="gmail-oauth-start",
    ),
    path(
        "oauth/callback/",
        GmailOAuthCallbackView.as_view(),
        name="gmail-oauth-callback",
    ),

    # Gmail operations
    path(
        "inbox/",
        GmailInboxView.as_view(),
        name="gmail-inbox",
    ),
    path(
        "messages/<str:message_id>/",
        GmailMessageDetailView.as_view(),
        name="gmail-message-detail",
    ),
    path(
        "send/",
        GmailSendMessageView.as_view(),
        name="gmail-send",
    ),
    path(
        "sent/",
        GmailSentMessagesView.as_view(),
        name="gmail-sent",
    ),

    # Appointment email reminders
    path(
        "reminders/",
        GmailAppointmentRemindersView.as_view(),
        name="gmail-appointment-reminders",
    ),
]
