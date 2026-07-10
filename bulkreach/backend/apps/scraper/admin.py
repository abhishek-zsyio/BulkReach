"""Scraper app — admin."""
from django.contrib import admin
from .models import ScrapeJob, ScrapedContact


@admin.register(ScrapeJob)
class ScrapeJobAdmin(admin.ModelAdmin):
    list_display = ("platform", "keywords", "location", "status", "result_count", "created_at")
    list_filter = ("platform", "status")
    search_fields = ("keywords", "user__username")
    readonly_fields = ("celery_task_id", "result_count", "created_at", "completed_at")


@admin.register(ScrapedContact)
class ScrapedContactAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "company", "job_title", "job", "created_at")
    search_fields = ("name", "email", "company")
    readonly_fields = ("created_at",)
