"""Recipients app — serializers."""
from rest_framework import serializers
from .models import RecipientList


class RecipientListSerializer(serializers.ModelSerializer):
    """Full recipient serializer."""

    class Meta:
        model = RecipientList
        fields = (
            "id", "campaign", "email", "name", "raw_data",
            "status", "error_message", "sent_at", "created_at",
            "is_opened", "opened_at", "opened_count",
        )
        read_only_fields = fields


class RecipientListBulkCreateSerializer(serializers.Serializer):
    """Used internally by the spreadsheet import to bulk-create recipients."""

    recipients = serializers.ListField(
        child=serializers.DictField(child=serializers.CharField(allow_blank=True)),
        allow_empty=False,
    )

    def validate_recipients(self, value):
        for row in value:
            email = row.get("email") or row.get("recipient_email")
            if not email:
                raise serializers.ValidationError(
                    "Each recipient row must contain an 'email' or 'recipient_email' field."
                )
        return value
