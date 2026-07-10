"""Logs app — models."""
from django.db import models


class SendLog(models.Model):
    """Immutable log entry for each email send attempt."""

    class EventType(models.TextChoices):
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"
        BOUNCED = "bounced", "Bounced"

    campaign = models.ForeignKey(
        "campaigns.Campaign",
        on_delete=models.CASCADE,
        related_name="send_logs",
    )
    recipient = models.ForeignKey(
        "recipients.RecipientList",
        on_delete=models.SET_NULL,
        null=True,
        related_name="send_logs",
    )
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    event_type = models.CharField(
        max_length=10,
        choices=EventType.choices,
        db_index=True,
    )
    gmail_message_id = models.CharField(max_length=255, blank=True)
    error_detail = models.TextField(blank=True)

    class Meta:
        ordering = ["-timestamp"]
        verbose_name = "Send Log"
        verbose_name_plural = "Send Logs"

    def __str__(self):
        recipient_email = self.recipient.email if self.recipient else "unknown"
        return f"[{self.event_type}] {recipient_email} at {self.timestamp:%Y-%m-%d %H:%M}"
