"""Logs app — URL routing."""
from django.urls import path
from .views import SendLogListView, SendLogStatsView

urlpatterns = [
    path("campaigns/<int:campaign_id>/logs/", SendLogListView.as_view(), name="send-log-list"),
    path("campaigns/<int:campaign_id>/logs/stats/", SendLogStatsView.as_view(), name="send-log-stats"),
]
