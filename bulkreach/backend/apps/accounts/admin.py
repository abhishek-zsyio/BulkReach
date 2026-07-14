"""Accounts app — Django admin registration."""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import UserProfile, UserResume, AIUsageLog


@admin.register(UserProfile)
class UserProfileAdmin(UserAdmin):
    """Admin panel for UserProfile — excludes sensitive token fields from display."""

    list_display = ("username", "email", "sender_name", "gmail_connected", "is_staff", "date_joined")
    list_filter = ("gmail_connected", "is_staff", "is_superuser", "is_active")
    search_fields = ("username", "email", "sender_name", "sender_email")
    ordering = ("-date_joined",)

    fieldsets = UserAdmin.fieldsets + (
        (
            "Gmail Integration",
            {
                "fields": ("sender_name", "sender_email", "gmail_connected", "gmail_token_expiry"),
                "description": "OAuth tokens are encrypted and not shown here.",
            },
        ),
    )

    # Never expose encrypted token fields in admin
    exclude = ("gmail_access_token", "gmail_refresh_token")
    readonly_fields = ("gmail_connected", "gmail_token_expiry")


@admin.register(UserResume)
class UserResumeAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "is_default", "created_at")
    list_filter = ("is_default", "created_at")
    search_fields = ("name", "user__username", "user__email")


@admin.register(AIUsageLog)
class AIUsageLogAdmin(admin.ModelAdmin):
    list_display = ("user", "request_type", "model_name", "timestamp")
    list_filter = ("request_type", "model_name", "timestamp")
    search_fields = ("user__username", "request_type")

