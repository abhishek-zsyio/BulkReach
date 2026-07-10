"""Campaigns app — Django admin registration."""
from django.contrib import admin
from .models import Campaign, EmailTemplate


@admin.register(EmailTemplate)
class EmailTemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "is_default", "created_at")
    list_filter = ("is_default",)
    search_fields = ("name", "user__username")
    ordering = ("-created_at",)
    readonly_fields = ("available_variables", "created_at", "updated_at")


@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = (
        "name", "user", "status", "total_recipients",
        "sent_count", "failed_count", "created_at",
    )
    list_filter = ("status",)
    search_fields = ("name", "user__username")
    ordering = ("-created_at",)
    readonly_fields = (
        "sent_count", "failed_count", "total_recipients",
        "celery_task_id", "started_at", "completed_at", "created_at",
    )
    fieldsets = (
        ("Campaign Info", {"fields": ("user", "name", "subject_template", "status", "template")}),
        ("Files", {"fields": ("spreadsheet_file", "resume_attachment", "column_mapping")}),
        ("Send Settings", {"fields": ("send_delay_seconds",)}),
        ("Progress", {"fields": ("total_recipients", "sent_count", "failed_count", "celery_task_id")}),
        ("Timestamps", {"fields": ("created_at", "started_at", "completed_at")}),
    )
