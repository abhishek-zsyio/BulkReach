"""Accounts app — Django admin registration."""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import UserProfile


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
    readonly_fields = ("gmail_connected", "gmail_token_expiry", "created_at", "updated_at")
