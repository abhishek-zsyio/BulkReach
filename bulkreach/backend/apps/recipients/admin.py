"""Recipients app — admin."""
from django.contrib import admin
from .models import RecipientList


@admin.register(RecipientList)
class RecipientListAdmin(admin.ModelAdmin):
    list_display = ("email", "name", "campaign", "status", "sent_at", "created_at")
    list_filter = ("status",)
    search_fields = ("email", "name", "campaign__name")
    ordering = ("-created_at",)
    readonly_fields = ("raw_data", "sent_at", "created_at")
