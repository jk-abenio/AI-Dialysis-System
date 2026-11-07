
from dataclasses import dataclass
from django.conf import settings


@dataclass
class SMSResult:
    success: bool
    provider: str
    status: str
    message_id: str = ""
    error: str = ""


class MockSMSProvider:
    """
    Simulates SMS sending without contacting a real provider.
    """

    provider_name = "mock"

    def send(self, phone_number, message):
        if not phone_number or not phone_number.strip():
            return SMSResult(
                success=False,
                provider=self.provider_name,
                status="failed",
                error="A recipient phone number is required.",
            )

        if not message or not message.strip():
            return SMSResult(
                success=False,
                provider=self.provider_name,
                status="failed",
                error="The SMS message cannot be empty.",
            )

        return SMSResult(
            success=True,
            provider=self.provider_name,
            status="simulated",
            message_id="",
        )


def get_sms_provider():
    provider_name = getattr(
        settings,
        "SMS_PROVIDER",
        "mock",
    ).strip().lower()

    if provider_name == "mock":
        return MockSMSProvider()

    raise ValueError(
        f"Unsupported SMS provider: {provider_name}. "
        "Only mock mode is configured at this stage."
    )
