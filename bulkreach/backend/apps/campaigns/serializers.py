"""Campaigns app — serializers."""
from rest_framework import serializers
from .models import Campaign, EmailTemplate, JobApplication
from apps.accounts.models import UserResume


class EmailTemplateSerializer(serializers.ModelSerializer):
    """Full template serializer — extracts available variables from html_body."""

    class Meta:
        model = EmailTemplate
        fields = (
            "id", "name", "subject", "html_body", "available_variables",
            "is_default", "created_at", "updated_at",
        )
        read_only_fields = ("id", "available_variables", "created_at", "updated_at")

    def validate_html_body(self, value):
        if not value.strip():
            raise serializers.ValidationError("Template body cannot be empty.")
        return value

    # available_variables is extracted by EmailTemplate.save() via regex.
    # No need to duplicate that logic here — the model is the single source of truth.


class EmailTemplateListSerializer(serializers.ModelSerializer):
    """Lightweight template serializer for list views."""

    class Meta:
        model = EmailTemplate
        fields = ("id", "name", "subject", "available_variables", "is_default", "created_at")
        read_only_fields = fields


class CampaignSerializer(serializers.ModelSerializer):
    """Full campaign serializer with progress and template name."""

    progress_percent = serializers.FloatField(read_only=True)
    template_name = serializers.CharField(source="template.name", read_only=True, default=None)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    subject_template = serializers.CharField(required=False, allow_blank=True, default="")
    resume = serializers.PrimaryKeyRelatedField(
        queryset=UserResume.objects.all(),
        required=False,
        allow_null=True
    )
    resume_name = serializers.CharField(source="resume.name", read_only=True, default=None)

    class Meta:
        model = Campaign
        fields = (
            "id", "name", "subject_template", "status", "status_display",
            "template", "template_name", "spreadsheet_file", "column_mapping",
            "resume_attachment", "send_delay_seconds",
            "open_tracking_enabled", "plain_text_mode",
            "total_recipients", "sent_count", "failed_count", "opened_count", "progress_percent",
            "celery_task_id", "created_at", "started_at", "completed_at",
            "google_sheet_id", "google_sheet_sync_enabled",
            "resume", "resume_name",
        )
        read_only_fields = (
            "id", "status", "total_recipients", "sent_count", "failed_count", "opened_count",
            "progress_percent", "celery_task_id", "started_at", "completed_at", "created_at",
        )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            self.fields['resume'].queryset = UserResume.objects.filter(user=request.user)

    def validate_send_delay_seconds(self, value):
        if value < 0:
            raise serializers.ValidationError("Delay must be non-negative.")
        if value > 60:
            raise serializers.ValidationError("Delay cannot exceed 60 seconds.")
        return value


class CampaignListSerializer(serializers.ModelSerializer):
    """Lightweight campaign serializer for list views."""

    progress_percent = serializers.FloatField(read_only=True)
    template_name = serializers.CharField(source="template.name", read_only=True, default=None)

    class Meta:
        model = Campaign
        fields = (
            "id", "name", "status", "template_name",
            "total_recipients", "sent_count", "failed_count", "opened_count",
            "progress_percent", "created_at",
        )
        read_only_fields = fields


class SpreadsheetUploadSerializer(serializers.Serializer):
    """Validates a spreadsheet file upload."""

    file = serializers.FileField(required=True)

    def validate_file(self, value):
        allowed_extensions = [".xlsx", ".xls", ".csv"]
        name = value.name.lower()
        if not any(name.endswith(ext) for ext in allowed_extensions):
            raise serializers.ValidationError(
                "Invalid file type. Please upload .xlsx, .xls, or .csv files."
            )
        if value.size > 10 * 1024 * 1024:  # 10 MB
            raise serializers.ValidationError("File size must be under 10 MB.")
        return value


class ColumnMappingSerializer(serializers.Serializer):
    """Validates column→variable mapping submitted by the user."""

    mapping = serializers.DictField(
        child=serializers.CharField(),
        required=True,
        help_text='e.g. {"Column A": "recipient_name", "Column B": "company_name"}',
    )

    def validate_mapping(self, value):
        if "email" not in value.values() and "recipient_email" not in value.values():
            raise serializers.ValidationError(
                'Mapping must include an "email" or "recipient_email" variable for the email column.'
            )
        return value


class JobApplicationSerializer(serializers.ModelSerializer):
    campaign_name = serializers.CharField(source="campaign.name", read_only=True, default=None)
    stage_display = serializers.CharField(source="get_stage_display", read_only=True)

    class Meta:
        model = JobApplication
        fields = (
            "id", "company_name", "job_title", "stage", "stage_display",
            "notes", "contact_name", "contact_email", "linkedin_url", "job_url",
            "interview_date", "campaign", "campaign_name", "created_at", "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at", "campaign_name", "stage_display")

