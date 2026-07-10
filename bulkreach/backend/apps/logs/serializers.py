"""Logs app — serializers."""
from rest_framework import serializers
from .models import SendLog


class SendLogSerializer(serializers.ModelSerializer):
    """Full log entry serializer."""

    recipient_email = serializers.CharField(
        source="recipient.email", read_only=True, default=""
    )
    recipient_name = serializers.CharField(
        source="recipient.name", read_only=True, default=""
    )
    recipient_is_opened = serializers.BooleanField(
        source="recipient.is_opened", read_only=True, default=False
    )
    recipient_opened_at = serializers.DateTimeField(
        source="recipient.opened_at", read_only=True, default=None
    )
    recipient_opened_count = serializers.IntegerField(
        source="recipient.opened_count", read_only=True, default=0
    )

    class Meta:
        model = SendLog
        fields = (
            "id", "campaign", "recipient", "recipient_email", "recipient_name",
            "recipient_is_opened", "recipient_opened_at", "recipient_opened_count",
            "timestamp", "event_type", "gmail_message_id", "error_detail",
        )
        read_only_fields = fields
