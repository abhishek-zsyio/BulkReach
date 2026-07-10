"""Logs app — admin."""
from django.contrib import admin
from .models import SendLog


@admin.register(SendLog)
class SendLogAdmin(admin.ModelAdmin):
    list_display = ("campaign", "recipient", "event_type", "gmail_message_id", "timestamp")
    list_filter = ("event_type",)
    search_fields = ("campaign__name", "recipient__email", "gmail_message_id")
    ordering = ("-timestamp",)
    readonly_fields = ("campaign", "recipient", "event_type", "gmail_message_id", "error_detail", "timestamp")
