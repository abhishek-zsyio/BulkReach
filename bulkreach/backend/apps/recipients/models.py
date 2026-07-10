"""Recipients app — models."""
from django.db import models


class RecipientList(models.Model):
    """Represents one row from the uploaded spreadsheet — one email target per campaign."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"
        SKIPPED = "skipped", "Skipped"

    campaign = models.ForeignKey(
        "campaigns.Campaign",
        on_delete=models.CASCADE,
        related_name="recipients",
    )
    email = models.EmailField(db_index=True)
    name = models.CharField(max_length=255, blank=True)
    raw_data = models.JSONField(
        default=dict,
        help_text="Full row from the spreadsheet after column mapping applied.",
    )
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    error_message = models.TextField(blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    is_opened = models.BooleanField(default=False, db_index=True)
    opened_at = models.DateTimeField(null=True, blank=True)
    opened_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        verbose_name = "Recipient"
        verbose_name_plural = "Recipients"
        unique_together = [("campaign", "email")]

    def __str__(self):
        return f"{self.email} → {self.campaign.name} [{self.status}]"
