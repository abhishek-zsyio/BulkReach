"""Logs app — views."""
import csv
import io
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from apps.campaigns.models import Campaign
from .models import SendLog
from .serializers import SendLogSerializer
from utils.pagination import StandardResultsPagination


class SendLogListView(ListAPIView):
    """GET /api/campaigns/:campaign_id/logs/"""

    permission_classes = [IsAuthenticated]
    serializer_class = SendLogSerializer
    pagination_class = StandardResultsPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["event_type"]

    def get_queryset(self):
        campaign_id = self.kwargs["campaign_id"]
        return SendLog.objects.filter(
            campaign__id=campaign_id,
            campaign__user=self.request.user,
        ).select_related("recipient")


class SendLogStatsView(APIView):
    """GET /api/campaigns/:campaign_id/logs/stats/ → { total, sent, failed, pending }"""

    permission_classes = [IsAuthenticated]

    def get(self, request, campaign_id):
        try:
            campaign = Campaign.objects.get(pk=campaign_id, user=request.user)
        except Campaign.DoesNotExist:
            return Response({"error": True, "message": "Campaign not found."}, status=404)

        from apps.recipients.models import RecipientList

        stats = {
            "total": campaign.total_recipients,
            "sent": RecipientList.objects.filter(campaign=campaign, status=RecipientList.Status.SENT).count(),
            "failed": RecipientList.objects.filter(campaign=campaign, status=RecipientList.Status.FAILED).count(),
            "pending": RecipientList.objects.filter(campaign=campaign, status=RecipientList.Status.PENDING).count(),
            "progress_percent": campaign.progress_percent,
            "status": campaign.status,
        }
        return Response(stats)
