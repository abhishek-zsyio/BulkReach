"""Scraper app — DRF serializers (Phase 2)."""
from rest_framework import serializers
from .models import ScrapeJob, ScrapedContact, CompanyEnrichment, CompanyEmployee


class ScrapedContactSerializer(serializers.ModelSerializer):
    """Serializer for individual scraped contacts."""

    class Meta:
        model = ScrapedContact
        fields = [
            "id", "name", "email", "company",
            "job_title", "linkedin_url", "source_url", "location", "salary", "posted_date", "created_at",
        ]
        read_only_fields = fields


class ScrapeJobSerializer(serializers.ModelSerializer):
    """Serializer for ScrapeJob list / detail views."""

    platform_display = serializers.CharField(source="get_platform_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = ScrapeJob
        fields = [
            "id", "platform", "platform_display",
            "keywords", "location", "max_results",
            "status", "status_display",
            "result_count", "error_message",
            "celery_task_id", "use_ai_matching", "freshness", "company_size", "created_at", "completed_at",
        ]
        read_only_fields = [
            "id", "status", "status_display", "platform_display",
            "result_count", "error_message", "celery_task_id",
            "created_at", "completed_at",
        ]


class ScrapeJobCreateSerializer(serializers.Serializer):
    """Serializer for creating / triggering a new scrape job."""

    platform = serializers.ChoiceField(choices=ScrapeJob.Platform.choices)
    keywords = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")
    location = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    max_results = serializers.IntegerField(min_value=1, default=50)
    campaign_id = serializers.IntegerField(required=True, allow_null=False)
    use_ai_matching = serializers.BooleanField(default=True)
    freshness = serializers.CharField(max_length=20, required=False, default="any")
    company_size = serializers.CharField(max_length=20, required=False, default="any")


class ScrapeJobResultsSerializer(serializers.Serializer):
    """Response shape for the results endpoint."""

    job = ScrapeJobSerializer()
    contacts = ScrapedContactSerializer(many=True)


class ScrapeJobImportSerializer(serializers.Serializer):
    """Request body for importing scraped contacts into a campaign."""

    campaign_id = serializers.IntegerField(min_value=1)


class CompanyEmployeeSerializer(serializers.ModelSerializer):
    """Serializer for company employees."""

    class Meta:
        model = CompanyEmployee
        fields = [
            "id",
            "name",
            "job_title",
            "linkedin_url",
            "email",
            "created_at",
        ]
        read_only_fields = fields


class CompanyEnrichmentSerializer(serializers.ModelSerializer):
    """Serializer for company enrichment requests."""

    status_display = serializers.CharField(source="get_status_display", read_only=True)
    employees = CompanyEmployeeSerializer(many=True, read_only=True)

    class Meta:
        model = CompanyEnrichment
        fields = [
            "id",
            "company_name",
            "domain",
            "logo_url",
            "website",
            "description",
            "industry",
            "location",
            "status",
            "status_display",
            "error_message",
            "created_at",
            "completed_at",
            "employees",
        ]
        read_only_fields = [
            "id",
            "domain",
            "logo_url",
            "website",
            "description",
            "industry",
            "location",
            "status",
            "status_display",
            "error_message",
            "created_at",
            "completed_at",
            "employees",
        ]


class CompanyEnrichmentCreateSerializer(serializers.Serializer):
    """Serializer for triggering a new company research job."""

    company_name = serializers.CharField(max_length=255)
    job_titles = serializers.ListField(
        child=serializers.CharField(max_length=255),
        required=False,
        default=list,
    )


class CompanyImportSerializer(serializers.Serializer):
    """Serializer for importing company employees to a campaign."""

    campaign_id = serializers.IntegerField(min_value=1)
    employee_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        default=list,
    )

