"""Campaigns app — URL routing for campaign endpoints."""
from django.urls import path
from .views import (
    CampaignListCreateView,
    CampaignDetailView,
    CampaignStartView,
    CampaignPauseView,
    CampaignCancelView,
    SpreadsheetUploadView,
    ColumnMappingView,
    CampaignCreateGoogleSheetView,
    CampaignSyncGoogleSheetView,
    JobApplicationViewSet,
)

urlpatterns = [
    path("", CampaignListCreateView.as_view(), name="campaign-list-create"),
    path("<int:pk>/", CampaignDetailView.as_view(), name="campaign-detail"),
    path("<int:pk>/start/", CampaignStartView.as_view(), name="campaign-start"),
    path("<int:pk>/pause/", CampaignPauseView.as_view(), name="campaign-pause"),
    path("<int:pk>/cancel/", CampaignCancelView.as_view(), name="campaign-cancel"),
    path("<int:pk>/upload-spreadsheet/", SpreadsheetUploadView.as_view(), name="campaign-upload-spreadsheet"),
    path("<int:pk>/map-columns/", ColumnMappingView.as_view(), name="campaign-map-columns"),
    path("<int:pk>/google-sheet/create/", CampaignCreateGoogleSheetView.as_view(), name="campaign-create-google-sheet"),
    path("<int:pk>/google-sheet/sync/", CampaignSyncGoogleSheetView.as_view(), name="campaign-sync-google-sheet"),
    
    # Job Application Tracker
    path("applications/", JobApplicationViewSet.as_view({"get": "list", "post": "create"}), name="application-list"),
    path("applications/bulk-delete/", JobApplicationViewSet.as_view({"post": "bulk_delete"}), name="application-bulk-delete"),
    path("applications/<int:pk>/", JobApplicationViewSet.as_view({"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"}), name="application-detail"),
]
