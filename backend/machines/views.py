from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Machine
from .serializers import MachineSerializer


class MachineViewSet(viewsets.ModelViewSet):

    queryset = Machine.objects.all()

    serializer_class = MachineSerializer

    permission_classes = [IsAuthenticated]