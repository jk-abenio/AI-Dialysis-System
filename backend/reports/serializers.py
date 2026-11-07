from rest_framework import serializers


class DailyReportSummarySerializer(serializers.Serializer):

    completed = serializers.IntegerField()

    scheduled = serializers.IntegerField()

    cancelled = serializers.IntegerField()

    patients = serializers.IntegerField()