
import base64
import html
import json
import logging
import secrets

from pathlib import Path
from email.message import EmailMessage

from urllib.parse import urlencode

from django.conf import settings
from django.core import signing
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.http import HttpResponseRedirect
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from schedules.models import Schedule
from .models import GmailConnection


logger = logging.getLogger(__name__)

GMAIL_SCOPES = [
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.send",
]

# Local logo stored beside this views.py file.
EMAIL_LOGO_PATH = (
    Path(__file__).resolve().parent / "FullLogo_NoBuffer.png"
)


# ============================================================
# GOOGLE OAUTH CONFIGURATION
# ============================================================

def get_oauth_config():
    client_id = settings.GOOGLE_CLIENT_ID
    client_secret = settings.GOOGLE_CLIENT_SECRET

    if not client_id or not client_secret:
        raise ValueError(
            "Google OAuth credentials are missing from .env."
        )

    return {
        "web": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [settings.GOOGLE_REDIRECT_URI],
        }
    }



def get_gmail_service():
    connection = (
        GmailConnection.objects
        .order_by("-connected_at")
        .first()
    )

    if not connection or not connection.token_data:
        raise ValueError(
            "Gmail is not connected. Connect your Google account first."
        )

    credentials = Credentials.from_authorized_user_info(
        connection.token_data,
        GMAIL_SCOPES,
    )

    # Check whether the stored OAuth credentials include
    # the permission required to mark emails as read.
    granted_scopes = set(credentials.scopes or [])
    required_scope = "https://www.googleapis.com/auth/gmail.modify"

    if required_scope not in granted_scopes:
        raise ValueError(
            "Your saved Gmail authorization does not include "
            "gmail.modify. Please reconnect your Google account "
            "and approve the updated permissions."
        )

    if credentials.expired and credentials.refresh_token:
        credentials.refresh(Request())

        connection.token_data = json.loads(credentials.to_json())
        connection.save(update_fields=["token_data"])

    if not credentials.valid:
        raise ValueError(
            "Gmail authorization has expired. Reconnect the account."
        )

    return build(
        "gmail",
        "v1",
        credentials=credentials,
        cache_discovery=False,
    )



# ============================================================
# EMAIL VALIDATION HELPERS
# ============================================================

def normalize_email_address(address):
    """Validate one email address without accepting display names."""
    if not isinstance(address, str):
        raise ValueError("Email addresses must be text.")

    address = address.strip()

    if not address:
        raise ValueError("An email address cannot be empty.")

    if "\r" in address or "\n" in address:
        raise ValueError("Email addresses cannot contain newlines.")

    try:
        validate_email(address)
    except ValidationError:
        raise ValueError(f"Invalid email address: {address}")

    return address


def normalize_cc_addresses(cc):
    """
    Accept a list or comma-separated string of CC addresses.
    Empty entries are ignored and duplicates are removed.
    """
    if cc is None:
        cc = []

    if isinstance(cc, str):
        cc = [cc]

    if not isinstance(cc, list):
        raise ValueError(
            "The CC field must contain email addresses."
        )

    addresses = []
    seen = set()

    for item in cc:
        if not isinstance(item, str):
            raise ValueError(
                "Each CC recipient must be an email address."
            )

        for address in item.split(","):
            address = address.strip()

            if not address:
                continue

            address = normalize_email_address(address)
            normalized = address.lower()

            if normalized not in seen:
                addresses.append(address)
                seen.add(normalized)

    return addresses


def get_max_results(request):
    """Parse and limit Gmail pagination results."""
    try:
        max_results = int(
            request.query_params.get("maxResults", 20)
        )
    except (TypeError, ValueError):
        max_results = 20

    return min(max(max_results, 1), 50)


# ============================================================
# GMAIL MESSAGE HELPERS
# ============================================================

def get_header(headers, name):
    for header in headers or []:
        if header.get("name", "").lower() == name.lower():
            return header.get("value", "")

    return ""


def extract_body(payload):
    """Extract readable text from a Gmail message payload."""
    mime_type = payload.get("mimeType", "")
    body_data = payload.get("body", {}).get("data")

    if body_data and mime_type == "text/plain":
        return base64.urlsafe_b64decode(
            body_data + "=" * (-len(body_data) % 4)
        ).decode("utf-8", errors="replace")

    parts = payload.get("parts", [])

    # Prefer plain text.
    for part in parts:
        if part.get("mimeType") == "text/plain":
            result = extract_body(part)
            if result:
                return result

    # Handle nested multipart messages.
    for part in parts:
        if part.get("mimeType", "").startswith("multipart/"):
            result = extract_body(part)
            if result:
                return result

    # Fall back to HTML if plain text is unavailable.
    if body_data and mime_type == "text/html":
        return base64.urlsafe_b64decode(
            body_data + "=" * (-len(body_data) % 4)
        ).decode("utf-8", errors="replace")

    return ""


def serialize_message(message, include_body=False):
    payload = message.get("payload", {})
    headers = payload.get("headers", [])
    labels = message.get("labelIds", [])

    result = {
        "id": message.get("id"),
        "threadId": message.get("threadId"),
        "from": get_header(headers, "From"),
        "to": get_header(headers, "To"),
        "cc": get_header(headers, "Cc"),
        "subject": get_header(headers, "Subject"),
        "date": get_header(headers, "Date"),
        "snippet": message.get("snippet", ""),
        "unread": "UNREAD" in labels,
    }

    if include_body:
        result["body"] = extract_body(payload)

    return result

# ============================================================
# API ERROR HANDLING
# ============================================================

def api_error_response(exc):
    logger.exception("Gmail API operation failed")

    if isinstance(exc, ValueError):
        return Response(
            {"error": str(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if isinstance(exc, HttpError):
        http_status = getattr(exc.resp, "status", None)

        if http_status in (401, 403):
            return Response(
                {
                    "error": (
                        "Gmail authorization failed or permission "
                        "was denied. Reconnect the Google account."
                    )
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if http_status == 400:
            return Response(
                {
                    "error": (
                        "Gmail rejected the request. Check the "
                        "recipient addresses, CC addresses, subject, "
                        "and message content."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    return Response(
        {"error": "Unable to complete the Gmail operation."},
        status=status.HTTP_502_BAD_GATEWAY,
    )


# ============================================================
# GMAIL OAUTH START
# ============================================================

class GmailOAuthStartView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            flow = Flow.from_client_config(
                get_oauth_config(),
                scopes=GMAIL_SCOPES,
                redirect_uri=settings.GOOGLE_REDIRECT_URI,
            )

            flow.code_verifier = secrets.token_urlsafe(64)

            state = signing.dumps(
                {"user_id": str(request.user.pk)},
                salt="gmail-oauth-state",
            )

            authorization_url, _ = flow.authorization_url(
                access_type="offline",
                include_granted_scopes="true",
                prompt="consent",
                state=state,
            )

            cache.set(
                f"gmail_oauth_verifier:{state}",
                flow.code_verifier,
                timeout=600,
            )

            return Response({
                "authorization_url": authorization_url,
            })

        except Exception:
            logger.exception("Could not start Gmail OAuth")

            return Response(
                {"error": "Unable to start Google authorization."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# ============================================================
# GMAIL OAUTH CALLBACK
# ============================================================

@method_decorator(csrf_exempt, name="dispatch")
class GmailOAuthCallbackView(View):

    def get(self, request):
        frontend_url = settings.FRONTEND_URL.rstrip("/")

        def redirect_with_status(value):
            return HttpResponseRedirect(
                f"{frontend_url}/notifications?"
                + urlencode({"gmail": value})
            )

        if request.GET.get("error"):
            return redirect_with_status("authorization_denied")

        state = request.GET.get("state")
        code = request.GET.get("code")

        if not state or not code:
            return redirect_with_status("authorization_failed")

        cache_key = f"gmail_oauth_verifier:{state}"

        try:
            signing.loads(
                state,
                salt="gmail-oauth-state",
                max_age=600,
            )

            code_verifier = cache.get(cache_key)

            if not code_verifier:
                logger.warning(
                    "Gmail OAuth callback has no stored PKCE verifier."
                )
                return redirect_with_status("oauth_session_expired")

            flow = Flow.from_client_config(
                get_oauth_config(),
                scopes=GMAIL_SCOPES,
                state=state,
                redirect_uri=settings.GOOGLE_REDIRECT_URI,
            )

            flow.code_verifier = code_verifier

            flow.fetch_token(
                authorization_response=request.build_absolute_uri(),
                code_verifier=code_verifier,
            )

            credentials = flow.credentials

            service = build(
                "gmail",
                "v1",
                credentials=credentials,
                cache_discovery=False,
            )

            profile = service.users().getProfile(
                userId="me"
            ).execute()

            token_data = json.loads(credentials.to_json())

            previous = (
                GmailConnection.objects
                .order_by("-connected_at")
                .first()
            )

            if (
                not token_data.get("refresh_token")
                and previous
                and previous.token_data
            ):
                token_data["refresh_token"] = (
                    previous.token_data.get("refresh_token")
                )

            email_address = profile.get("emailAddress", "")

            if previous:
                previous.email_address = email_address
                previous.token_data = token_data
                previous.connected_at = timezone.now()

                previous.save(
                    update_fields=[
                        "email_address",
                        "token_data",
                        "connected_at",
                    ]
                )
            else:
                GmailConnection.objects.create(
                    email_address=email_address,
                    token_data=token_data,
                    connected_at=timezone.now(),
                )

            cache.delete(cache_key)

            logger.info(
                "Gmail connected successfully for %s",
                email_address,
            )

            return redirect_with_status("connected")

        except signing.BadSignature:
            logger.warning("Invalid Gmail OAuth state.")
            return redirect_with_status("invalid_state")

        except Exception:
            logger.exception("Gmail OAuth callback failed")
            return redirect_with_status("connection_failed")


# ============================================================
# GMAIL INBOX
# ============================================================

class GmailInboxView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            service = get_gmail_service()

            query = request.query_params.get("q", "").strip()
            page_token = request.query_params.get("pageToken")
            max_results = get_max_results(request)

            params = {
                "userId": "me",
                "labelIds": ["INBOX"],
                "maxResults": max_results,
            }

            if query:
                params["q"] = query

            if page_token:
                params["pageToken"] = page_token

            result = service.users().messages().list(
                **params
            ).execute()

            messages = []

            for item in result.get("messages", []):
                message = service.users().messages().get(
                    userId="me",
                    id=item["id"],
                    format="metadata",
                    metadataHeaders=[
                        "From", "To", "Cc", "Subject", "Date",
                    ],
                ).execute()

                messages.append(serialize_message(message))

            return Response({
                "messages": messages,
                "nextPageToken": result.get("nextPageToken"),
                "resultSizeEstimate": result.get(
                    "resultSizeEstimate", 0
                ),
            })

        except Exception as exc:
            return api_error_response(exc)


# ============================================================
# GMAIL MESSAGE DETAILS
# ============================================================

class GmailMessageDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, message_id):
        try:
            service = get_gmail_service()

            # Retrieve the complete email.
            message = service.users().messages().get(
                userId="me",
                id=message_id,
                format="full",
            ).execute()

            labels = message.get("labelIds", [])

            # Mark the message as read if it is currently unread.
            if "UNREAD" in labels:
                service.users().messages().modify(
                    userId="me",
                    id=message_id,
                    body={
                        "removeLabelIds": ["UNREAD"],
                    },
                ).execute()

                # Update the response to reflect the new status.
                message["labelIds"] = [
                    label
                    for label in labels
                    if label != "UNREAD"
                ]

            return Response(
                serialize_message(
                    message,
                    include_body=True,
                )
            )

        except Exception as exc:
            return api_error_response(exc)

# ============================================================
# SEND GMAIL MESSAGE WITH LOCAL LOGO
# ============================================================

class GmailSendMessageView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        to_email = request.data.get("to", "")
        subject = request.data.get("subject", "")
        body = request.data.get("body", "")
        cc = request.data.get("cc", [])

        if not isinstance(to_email, str):
            return Response(
                {"error": "The recipient must be an email address."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not isinstance(subject, str):
            return Response(
                {"error": "The subject must be text."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not isinstance(body, str):
            return Response(
                {"error": "The message body must be text."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        to_email = to_email.strip()
        subject = subject.strip()

        if not to_email or not subject or not body.strip():
            return Response(
                {
                    "error": (
                        "Recipient, subject, and message body "
                        "are required."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            to_email = normalize_email_address(to_email)

            if "\r" in subject or "\n" in subject:
                raise ValueError(
                    "The subject cannot contain newline characters."
                )

            cc_addresses = normalize_cc_addresses(cc)

        except ValueError as exc:
            return Response(
                {"error": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            email = EmailMessage()
            email["To"] = to_email

            if cc_addresses:
                email["Cc"] = ", ".join(cc_addresses)

            email["Subject"] = subject

            # Plain-text fallback for email clients that don't support HTML.
            email.set_content(body)

            safe_body = html.escape(body).replace("\n", "<br>\n")

            logo_html = ""

            if EMAIL_LOGO_PATH.is_file():
                logo_html = """
                    <img
                        src="cid:dialysis_logo"
                        alt="AI Dialysis System Logo"
                        width="150"
                        style="
                            display:block;
                            width:150px;
                            max-width:100%;
                            height:auto;
                            margin:0 auto 14px;
                        "
                    />
                """
            else:
                logger.warning(
                    "Email logo was not found: %s",
                    EMAIL_LOGO_PATH,
                )

            html_body = f"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport"
                      content="width=device-width, initial-scale=1.0">
                <title>AI Dialysis System</title>
            </head>
            <body style="
                margin:0;
                padding:24px 12px;
                background-color:#f1f5f9;
                font-family:Arial,Helvetica,sans-serif;
                color:#334155;
            ">
                <table
                    role="presentation"
                    width="100%"
                    cellpadding="0"
                    cellspacing="0"
                    style="
                        max-width:600px;
                        margin:0 auto;
                        background-color:#ffffff;
                        border-radius:10px;
                        overflow:hidden;
                    "
                >
                    <tr>
                        <td style="
                            background-color:#323d42;
                            padding:28px 20px;
                            text-align:center;
                        ">
                            {logo_html}

                            <h2 style="
                                margin:0;
                                color:#ffffff;
                                font-size:22px;
                            ">
                                AI Dialysis System
                            </h2>

                            <p style="
                                margin:8px 0 0;
                                color:#cbd5e1;
                                font-size:13px;
                            ">
                                Scheduling &amp; Monitoring
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="
                            padding:28px 24px;
                            font-size:14px;
                            line-height:1.8;
                            overflow-wrap:anywhere;
                        ">
                            {safe_body}
                        </td>
                    </tr>

                    <tr>
                        <td style="
                            padding:16px 24px;
                            background-color:#f8fafc;
                            border-top:1px solid #e2e8f0;
                            color:#64748b;
                            font-size:11px;
                            text-align:center;
                        ">
                            This email was sent through the
                            AI Dialysis Scheduling &amp; Monitoring System.
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            """

            email.add_alternative(html_body, subtype="html")

            # Attach the local logo to the HTML MIME part.
            if EMAIL_LOGO_PATH.is_file():
                with EMAIL_LOGO_PATH.open("rb") as image_file:
                    logo_bytes = image_file.read()

                html_part = email.get_body(
                    preferencelist=("html",)
                )

                if html_part is None:
                    raise ValueError(
                        "Unable to prepare the HTML email body."
                    )

                html_part.add_related(
                    logo_bytes,
                    maintype="image",
                    subtype="png",
                    cid="<dialysis_logo>",
                    filename="FullLogo_NoBuffer.png",
                    disposition="inline",
                )

            raw_message = base64.urlsafe_b64encode(
                email.as_bytes()
            ).decode("utf-8")

            service = get_gmail_service()

            result = service.users().messages().send(
                userId="me",
                body={"raw": raw_message},
            ).execute()

            logger.info(
                "Email sent successfully. Gmail message ID: %s",
                result.get("id"),
            )

            return Response({
                "success": True,
                "message": "Email sent successfully.",
                "id": result.get("id"),
                "threadId": result.get("threadId"),
            })

        except Exception as exc:
            return api_error_response(exc)



# ============================================================
# APPOINTMENT EMAIL REMINDERS
# ============================================================

class GmailAppointmentRemindersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Return upcoming scheduled appointments for email reminders."""
        today = timezone.localdate()

        schedules = (
            Schedule.objects
            .filter(
                status="Scheduled",
                dialysis_date__gte=today,
                patient__status="Active",
            )
            .select_related("patient")
            .order_by("dialysis_date", "dialysis_time")
        )

        results = []

        for schedule in schedules:
            patient = schedule.patient

            results.append({
                "schedule_id": schedule.pk,
                "patient_id": patient.pk,
                "patient_code": patient.patient_id,
                "patient_name": (
                    f"{patient.first_name} {patient.last_name}"
                ).strip(),
                "email": patient.email or "",
                "dialysis_date": schedule.dialysis_date.isoformat(),
                "dialysis_time": schedule.dialysis_time.strftime(
                    "%H:%M:%S"
                ),
                "shift": schedule.shift,
            })

        return Response({"results": results})

    def post(self, request):
        """Send individual appointment reminder emails."""
        schedule_ids = request.data.get("schedule_ids")

        if not isinstance(schedule_ids, list) or not schedule_ids:
            return Response(
                {"error": "Select at least one appointment."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(schedule_ids) > 100:
            return Response(
                {"error": "A maximum of 100 reminders can be processed at once."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if any(
            isinstance(item, bool) or not isinstance(item, int)
            for item in schedule_ids
        ):
            return Response(
                {"error": "Every schedule ID must be an integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(set(schedule_ids)) != len(schedule_ids):
            return Response(
                {"error": "Duplicate appointment IDs are not allowed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        schedules = Schedule.objects.filter(
            pk__in=schedule_ids,
            status="Scheduled",
            dialysis_date__gte=timezone.localdate(),
            patient__status="Active",
        ).select_related("patient")

        schedules_by_id = {
            schedule.pk: schedule for schedule in schedules
        }

        invalid_ids = [
            schedule_id
            for schedule_id in schedule_ids
            if schedule_id not in schedules_by_id
        ]

        # Do not attempt to send if Gmail is not connected.
        try:
            service = get_gmail_service()
        except Exception as exc:
            return api_error_response(exc)

        results = []

        for schedule_id in schedule_ids:
            schedule = schedules_by_id.get(schedule_id)

            if schedule is None:
                results.append({
                    "schedule_id": schedule_id,
                    "success": False,
                    "error": (
                        "Appointment was not found, is no longer "
                        "eligible, or the patient is inactive."
                    ),
                })
                continue

            patient = schedule.patient
            patient_name = (
                f"{patient.first_name} {patient.last_name}"
            ).strip()
            recipient = (patient.email or "").strip()

            if not recipient:
                results.append({
                    "schedule_id": schedule.pk,
                    "patient_id": patient.pk,
                    "patient_name": patient_name,
                    "email": "",
                    "success": False,
                    "error": "The patient has no registered email address.",
                })
                continue

            try:
                recipient = normalize_email_address(recipient)

                appointment_date = schedule.dialysis_date.strftime(
                    "%B %d, %Y"
                )
                appointment_time = schedule.dialysis_time.strftime(
                    "%I:%M %p"
                )

                subject = "Reminder: Your Upcoming Dialysis Appointment"

                body = (
                    f"Dear {patient.first_name},\n\n"
                    "This is a friendly reminder of your upcoming "
                    "dialysis appointment.\n\n"
                    f"Appointment date: {appointment_date}\n"
                    f"Appointment time: {appointment_time}\n"
                    f"Shift: {schedule.shift}\n\n"
                    "Please arrive on time for your scheduled session. "
                    "If you need assistance or need to discuss your "
                    "appointment, please contact the clinic directly.\n\n"
                    "Please do not reply to this automated reminder.\n\n"
                    "Thank you,\n"
                    "AI Dialysis Scheduling & Monitoring System"
                )

                email = EmailMessage()
                email["To"] = recipient
                email["Subject"] = subject
                email.set_content(body)

                safe_body = html.escape(body).replace(
                    "\n", "<br>\n"
                )

                logo_html = ""

                if EMAIL_LOGO_PATH.is_file():
                    logo_html = """
                        <img
                            src="cid:dialysis_logo"
                            alt="AI Dialysis System Logo"
                            width="150"
                            style="display:block;width:150px;
                            max-width:100%;height:auto;margin:0 auto 14px;"
                        />
                    """

                html_body = f"""
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport"
                          content="width=device-width, initial-scale=1.0">
                </head>
                <body style="
                    margin:0;
                    padding:24px 12px;
                    background:#f1f5f9;
                    font-family:Arial,Helvetica,sans-serif;
                    color:#334155;
                ">
                    <table role="presentation" width="100%"
                           cellpadding="0" cellspacing="0"
                           style="max-width:600px;margin:0 auto;
                           background:#ffffff;border-radius:10px;
                           overflow:hidden;">
                        <tr>
                            <td style="background:#323d42;padding:28px 20px;
                                       text-align:center;">
                                {logo_html}
                                <h2 style="margin:0;color:#ffffff;">
                                    AI Dialysis System
                                </h2>
                                <p style="margin:8px 0 0;color:#cbd5e1;
                                          font-size:13px;">
                                    Appointment Reminder
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:28px 24px;font-size:14px;
                                       line-height:1.8;
                                       overflow-wrap:anywhere;">
                                {safe_body}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:16px 24px;background:#f8fafc;
                                       border-top:1px solid #e2e8f0;
                                       color:#64748b;font-size:11px;
                                       text-align:center;">
                                This email was sent through the
                                AI Dialysis Scheduling &amp; Monitoring System.
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
                """

                email.add_alternative(html_body, subtype="html")

                if EMAIL_LOGO_PATH.is_file():
                    with EMAIL_LOGO_PATH.open("rb") as image_file:
                        logo_bytes = image_file.read()

                    html_part = email.get_body(
                        preferencelist=("html",)
                    )

                    if html_part is not None:
                        html_part.add_related(
                            logo_bytes,
                            maintype="image",
                            subtype="png",
                            cid="<dialysis_logo>",
                            filename="FullLogo_NoBuffer.png",
                            disposition="inline",
                        )

                raw_message = base64.urlsafe_b64encode(
                    email.as_bytes()
                ).decode("utf-8")

                gmail_result = service.users().messages().send(
                    userId="me",
                    body={"raw": raw_message},
                ).execute()

                results.append({
                    "schedule_id": schedule.pk,
                    "patient_id": patient.pk,
                    "patient_name": patient_name,
                    "email": recipient,
                    "success": True,
                    "message": "Gmail accepted the reminder.",
                    "gmail_message_id": gmail_result.get("id"),
                })

            except ValueError as exc:
                results.append({
                    "schedule_id": schedule.pk,
                    "patient_id": patient.pk,
                    "patient_name": patient_name,
                    "email": recipient,
                    "success": False,
                    "error": str(exc),
                })

            except Exception:
                logger.exception(
                    "Appointment reminder email failed for schedule %s",
                    schedule.pk,
                )

                results.append({
                    "schedule_id": schedule.pk,
                    "patient_id": patient.pk,
                    "patient_name": patient_name,
                    "email": recipient,
                    "success": False,
                    "error": (
                        "Gmail could not send this reminder. "
                        "Check the Gmail connection and try again."
                    ),
                })

        successful = sum(
            1 for item in results if item.get("success")
        )
        failed = len(results) - successful

        return Response(
            {
                "message": "Appointment email reminder processing completed.",
                "selected": len(schedule_ids),
                "processed": successful,
                "failed": failed,
                "invalid_schedule_ids": invalid_ids,
                "results": results,
            },
            status=status.HTTP_201_CREATED,
        )



# ============================================================
# GMAIL SENT MESSAGES
# ============================================================

class GmailSentMessagesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            service = get_gmail_service()

            query = request.query_params.get("q", "").strip()
            page_token = request.query_params.get("pageToken")
            max_results = get_max_results(request)

            params = {
                "userId": "me",
                "labelIds": ["SENT"],
                "maxResults": max_results,
            }

            if query:
                params["q"] = query

            if page_token:
                params["pageToken"] = page_token

            result = service.users().messages().list(
                **params
            ).execute()

            messages = []

            for item in result.get("messages", []):
                message = service.users().messages().get(
                    userId="me",
                    id=item["id"],
                    format="metadata",
                    metadataHeaders=[
                        "From", "To", "Cc", "Subject", "Date",
                    ],
                ).execute()

                messages.append(serialize_message(message))

            return Response({
                "messages": messages,
                "nextPageToken": result.get("nextPageToken"),
                "resultSizeEstimate": result.get(
                    "resultSizeEstimate", 0
                ),
            })

        except Exception as exc:
            return api_error_response(exc)
