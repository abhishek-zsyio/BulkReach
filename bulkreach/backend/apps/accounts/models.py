"""Accounts app — models for user profiles with Gmail OAuth token storage."""
import logging
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings
from encrypted_model_fields.fields import EncryptedCharField

logger = logging.getLogger(__name__)



class UserProfile(AbstractUser):
    """
    Extended user model that stores Gmail OAuth2 tokens securely (encrypted at rest).
    Tokens are never returned in API responses — see accounts/serializers.py.
    """

    sender_name = models.CharField(
        max_length=150,
        blank=True,
        help_text="Display name shown in outgoing emails.",
    )
    sender_email = models.EmailField(
        blank=True,
        help_text="Gmail address used for sending. Set after OAuth.",
    )

    # Gmail OAuth tokens — stored encrypted using django-encrypted-model-fields
    gmail_access_token = EncryptedCharField(
        max_length=2048,
        blank=True,
        null=True,
        help_text="Encrypted Gmail OAuth2 access token.",
    )
    gmail_refresh_token = EncryptedCharField(
        max_length=2048,
        blank=True,
        null=True,
        help_text="Encrypted Gmail OAuth2 refresh token.",
    )
    gmail_token_expiry = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Expiry datetime of the current access token.",
    )
    gmail_connected = models.BooleanField(
        default=False,
        help_text="True when a valid Gmail OAuth connection exists.",
    )

    resume_text = models.TextField(
        blank=True,
        help_text="Extracted text from the user's resume PDF.",
    )
    gemini_api_key = EncryptedCharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Encrypted Gemini API Key provided by the user.",
    )
    gemini_model = models.CharField(
        max_length=50,
        default="gemini-2.5-flash",
        blank=True,
        help_text=(
            "Gemini model used for AI tasks. Current options: "
            "gemini-2.5-flash (recommended), gemini-2.5-pro, "
            "gemini-2.0-flash."
        ),
    )

    is_onboarded = models.BooleanField(
        default=False,
        help_text="True if the user has completed the onboarding flow.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date_joined"]
        verbose_name = "User Profile"
        verbose_name_plural = "User Profiles"

    def __str__(self):
        return f"{self.username} <{self.email}>"

    @property
    def has_gmail_oauth(self) -> bool:
        """Returns True if the user has a Gmail refresh token stored."""
        return bool(self.gmail_refresh_token)

class UserResume(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="resumes")
    name = models.CharField(max_length=200, help_text="e.g. Frontend Developer, Data Scientist")
    file = models.FileField(upload_to="resumes/%Y/%m/", null=True, blank=True)
    parsed_text = models.TextField(blank=True, help_text="Text extracted from the resume PDF for AI matching")
    structured_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Extracted structured resume data (summary, skills, experience, education, etc.)"
    )
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "User Resume"
        verbose_name_plural = "User Resumes"

    def __str__(self):
        return f"{self.name} ({self.user.username})"


class AIUsageLog(models.Model):
    """Logs individual Gemini API requests made by the user."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ai_usage_logs",
    )
    request_type = models.CharField(
        max_length=100,
        help_text="The action that triggered the Gemini request (e.g. Resume Parsing, Job Matching).",
    )
    model_name = models.CharField(
        max_length=100,
        default="gemini-2.5-flash",
        help_text="The Gemini model used.",
    )
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]
        verbose_name = "AI Usage Log"
        verbose_name_plural = "AI Usage Logs"

    def __str__(self):
        return f"{self.user.username} - {self.request_type} @ {self.timestamp}"


def log_ai_usage(user, request_type: str, model_name: str = "gemini-2.5-flash"):
    """Creates a log entry for a Gemini API request."""
    try:
        AIUsageLog.objects.create(
            user=user,
            request_type=request_type,
            model_name=model_name,
        )
    except Exception as e:
        logger.error("Failed to log AI usage for %s: %s", user.username, e)

