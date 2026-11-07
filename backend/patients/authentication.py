from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken

from .models import Patient


class PatientJWTAuthentication(JWTAuthentication):

    def get_user(self, validated_token):

        patient_id = validated_token.get("patient_id")

        if patient_id is None:
            raise InvalidToken("Token contained no patient identification")

        try:
            return Patient.objects.get(id=patient_id)

        except Patient.DoesNotExist:
            raise InvalidToken("Patient does not exist")