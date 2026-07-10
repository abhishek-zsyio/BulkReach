"""Recipients app — URL routing."""
from django.urls import path
from .views import (
    RecipientListView,
    RecipientExportView,
    RecipientImportView,
    RecipientBulkUpdateView,
    TrackingPixelView,
    RecipientResendView,
    RetryAllFailedView,
)

urlpatterns = [
    path("campaigns/<int:campaign_id>/recipients/", RecipientListView.as_view(), name="recipient-list"),
    path("campaigns/<int:campaign_id>/recipients/export/", RecipientExportView.as_view(), name="recipient-export"),
    path("campaigns/<int:campaign_id>/recipients/import/", RecipientImportView.as_view(), name="recipient-import"),
    path("campaigns/<int:campaign_id>/recipients/bulk-update/", RecipientBulkUpdateView.as_view(), name="recipient-bulk-update"),
    path("campaigns/<int:campaign_id>/recipients/retry-failed/", RetryAllFailedView.as_view(), name="recipient-retry-all-failed"),
    path("track/<str:token>/", TrackingPixelView.as_view(), name="track-pixel"),
    path("<int:pk>/resend/", RecipientResendView.as_view(), name="recipient-resend"),
]
