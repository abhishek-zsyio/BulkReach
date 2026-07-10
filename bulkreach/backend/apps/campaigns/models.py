"""Campaigns app — models."""
import re
import uuid
import logging
from django.db import models
from django.conf import settings

logger = logging.getLogger(__name__)


class EmailTemplate(models.Model):
    """Reusable email template with Jinja2-style variable placeholders."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="email_templates",
    )
    name = models.CharField(max_length=200)
    subject = models.CharField(
        max_length=250,
        blank=True,
        default="",
        help_text="Default email subject template.",
    )
    html_body = models.TextField(
        help_text="HTML content with {{ variable_name }} placeholders."
    )
    available_variables = models.JSONField(
        default=list,
        help_text="List of variable names extracted from html_body.",
    )
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Email Template"
        verbose_name_plural = "Email Templates"

    def __str__(self):
        return f"{self.name} (by {self.user.username})"

    def save(self, *args, **kwargs):
        html_body = self.html_body or ""
        variables = list(set(re.findall(r"\{\{\s*(\w+)\s*\}\}", html_body)))
        self.available_variables = sorted(variables)
        super().save(*args, **kwargs)

        # Dispatch async Celery task to sync all linked campaigns.
        # This avoids blocking the request with a synchronous N+1 loop.
        try:
            from .tasks_admin import sync_template_campaigns
            sync_template_campaigns.delay(self.pk)
        except Exception as e:
            logger.error(
                "Failed to dispatch sync_template_campaigns for template %s: %s",
                self.pk,
                e,
            )


class Campaign(models.Model):
    """Core campaign model — links template, spreadsheet, and attachment together."""

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        QUEUED = "queued", "Queued"
        RUNNING = "running", "Running"
        PAUSED = "paused", "Paused"
        DONE = "done", "Done"
        FAILED = "failed", "Failed"
        CANCELLED = "cancelled", "Cancelled"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="campaigns",
    )
    name = models.CharField(max_length=200)
    subject_template = models.CharField(
        max_length=500,
        blank=True,
        default="",
        help_text="Email subject, may include {{ variable_name }} placeholders.",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )
    template = models.ForeignKey(
        EmailTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="campaigns",
    )
    spreadsheet_file = models.FileField(
        upload_to="spreadsheets/%Y/%m/",
        null=True,
        blank=True,
    )
    column_mapping = models.JSONField(
        default=dict,
        blank=True,
        help_text='Maps spreadsheet column names to template variables. e.g. {"B": "recipient_name"}',
    )
    resume = models.ForeignKey(
        "accounts.UserResume",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="campaigns",
        help_text="The resume selected for this campaign.",
    )
    # Deprecated in favor of the 'resume' ForeignKey above.
    # Left here for backward compatibility until fully migrated.
    resume_attachment = models.FileField(
        upload_to="resumes/%Y/%m/",
        null=True,
        blank=True,
    )
    send_delay_seconds = models.FloatField(
        default=1.5,
        help_text="Delay in seconds between individual email sends to avoid Gmail rate limits.",
    )
    total_recipients = models.PositiveIntegerField(default=0)
    sent_count = models.PositiveIntegerField(default=0)
    failed_count = models.PositiveIntegerField(default=0)
    opened_count = models.PositiveIntegerField(default=0)
    celery_task_id = models.CharField(max_length=255, blank=True, null=True)
    google_sheet_id = models.CharField(max_length=255, blank=True, null=True)
    google_sheet_sync_enabled = models.BooleanField(default=False)
    open_tracking_enabled = models.BooleanField(
        default=False,
        help_text="Inject a hidden pixel to track email opens. Disabled by default for better deliverability.",
    )
    plain_text_mode = models.BooleanField(
        default=False,
        help_text=(
            "Send as plain-text only (no HTML). Maximises inbox placement for "
            "cold job-application outreach. When enabled, HTML is stripped and "
            "no tracking pixel is injected regardless of open_tracking_enabled."
        ),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Campaign"
        verbose_name_plural = "Campaigns"

    def __str__(self):
        return f"[{self.status.upper()}] {self.name} ({self.user.username})"

    @property
    def progress_percent(self) -> float:
        if self.total_recipients == 0:
            return 0.0
        return round((self.sent_count + self.failed_count) / self.total_recipients * 100, 1)

    def save(self, *args, **kwargs):
        # Auto-populate subject_template from selected template if blank
        if not self.subject_template and self.template:
            self.subject_template = self.template.subject or self.template.name

        # Only check for template change when "template" is in update_fields
        # (or when update_fields is None, meaning a full save).
        update_fields = kwargs.get("update_fields")
        check_template = update_fields is None or "template" in update_fields

        template_changed = False
        if check_template and self.pk:
            # Single targeted query — only fetch template_id, not the whole row
            old_template_id = (
                Campaign.objects.filter(pk=self.pk)
                .values_list("template_id", flat=True)
                .first()
            )
            if old_template_id != self.template_id:
                template_changed = True
        elif check_template and not self.pk and self.template_id:
            template_changed = True

        super().save(*args, **kwargs)

        if template_changed and self.template:
            try:
                from .services.spreadsheet_sync import sync_campaign_columns
                sync_campaign_columns(self)
            except Exception as e:
                logger.error(
                    "Error syncing spreadsheet columns for campaign %s: %s", self.id, e
                )


class JobApplication(models.Model):
    """Represents a job application being tracked in the Kanban Board."""

    class Stage(models.TextChoices):
        SAVED = "saved", "Saved"
        APPLIED = "applied", "Applied"
        INTERVIEW = "interview", "Interview"
        OFFER = "offer", "Offer"
        REJECTED = "rejected", "Rejected"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="job_applications",
    )
    company_name = models.CharField(max_length=255)
    job_title = models.CharField(max_length=255)
    stage = models.CharField(
        max_length=20,
        choices=Stage.choices,
        default=Stage.SAVED,
        db_index=True,
    )
    notes = models.TextField(blank=True, default="")
    contact_name = models.CharField(max_length=255, blank=True, default="")
    contact_email = models.EmailField(blank=True, default="")
    linkedin_url = models.URLField(blank=True, default="")
    job_url = models.URLField(blank=True, default="")
    interview_date = models.DateTimeField(null=True, blank=True)
    campaign = models.ForeignKey(
        Campaign,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="job_applications",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        verbose_name = "Job Application"
        verbose_name_plural = "Job Applications"

    def __str__(self):
        return f"{self.job_title} @ {self.company_name} [{self.stage}]"

    @classmethod
    def promote_or_create(cls, campaign, recipient):
        """Auto-moves target company's job application to Applied or creates it."""
        row_data = recipient.raw_data or {}
        company_name = (
            row_data.get("company_name")
            or row_data.get("company")
            or "Unknown Company"
        ).strip()
        job_title = (
            row_data.get("job_title")
            or row_data.get("role")
            or "Job Application"
        ).strip()

        # Look for an existing application in "saved" stage
        app = cls.objects.filter(
            user=campaign.user,
            company_name__iexact=company_name,
            stage=cls.Stage.SAVED,
        ).first()

        if app:
            app.stage = cls.Stage.APPLIED
            app.campaign = campaign
            if not app.contact_name:
                app.contact_name = recipient.name
            if not app.contact_email:
                app.contact_email = recipient.email
            if job_title != "Job Application" and app.job_title == "Job Application":
                app.job_title = job_title
            app.save()
            logger.info(
                "Promoted JobApplication %s to APPLIED stage for company %s",
                app.id,
                company_name,
            )
        else:
            # Create a brand new job application in the APPLIED stage
            new_app = cls.objects.create(
                user=campaign.user,
                company_name=company_name,
                job_title=job_title,
                stage=cls.Stage.APPLIED,
                contact_name=recipient.name,
                contact_email=recipient.email,
                campaign=campaign,
            )
            logger.info(
                "Created brand new JobApplication %s in APPLIED stage for company %s",
                new_app.id,
                company_name,
            )
