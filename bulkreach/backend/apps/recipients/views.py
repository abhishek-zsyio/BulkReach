"""Recipients app — views."""
import csv
import io
import base64
from django.core.signing import Signer, BadSignature
from django.utils import timezone
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from apps.campaigns.models import Campaign
from apps.campaigns.services.spreadsheet_parser import SpreadsheetParser
from .models import RecipientList
from .serializers import RecipientListSerializer
from utils.pagination import LargeResultsPagination


class RecipientListView(ListAPIView):
    """GET /api/campaigns/:campaign_id/recipients/"""

    permission_classes = [IsAuthenticated]
    serializer_class = RecipientListSerializer
    pagination_class = LargeResultsPagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status"]

    def get_queryset(self):
        campaign_id = self.kwargs["campaign_id"]
        return RecipientList.objects.filter(
            campaign__id=campaign_id,
            campaign__user=self.request.user,
        )


class RecipientExportView(APIView):
    """GET /api/campaigns/:campaign_id/recipients/export/ — download recipients as CSV."""

    permission_classes = [IsAuthenticated]

    def get(self, request, campaign_id):
        try:
            campaign = Campaign.objects.get(pk=campaign_id, user=request.user)
        except Campaign.DoesNotExist:
            return Response({"error": True, "message": "Campaign not found."}, status=404)

        recipients = RecipientList.objects.filter(campaign=campaign)

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Email", "Name", "Status", "Error", "Sent At", "Opened", "Opened At", "Opened Count"])
        for r in recipients.iterator():
            writer.writerow([
                r.email,
                r.name,
                r.status,
                r.error_message,
                r.sent_at.isoformat() if r.sent_at else "",
                "Yes" if r.is_opened else "No",
                r.opened_at.isoformat() if r.opened_at else "",
                r.opened_count,
            ])

        response = HttpResponse(output.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = (
            f'attachment; filename="campaign_{campaign_id}_recipients.csv"'
        )
        return response


class RecipientImportView(APIView):
    """
    POST /api/campaigns/:campaign_id/recipients/import/
    Parse spreadsheet and bulk-create RecipientList rows.
    Called after column mapping is saved.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, campaign_id):
        try:
            campaign = Campaign.objects.get(pk=campaign_id, user=request.user)
        except Campaign.DoesNotExist:
            return Response({"error": True, "message": "Campaign not found."}, status=404)

        if not campaign.spreadsheet_file or not campaign.column_mapping:
            return Response(
                {"error": True, "message": "Upload a spreadsheet and map columns first."},
                status=400,
            )

        parser = SpreadsheetParser()
        rows = parser.parse_all_rows(campaign.spreadsheet_file.path, campaign.column_mapping)

        # Clear existing pending recipients before re-import
        RecipientList.objects.filter(campaign=campaign, status=RecipientList.Status.PENDING).delete()

        created = 0
        skipped = 0
        bulk_list = []

        for row in rows:
            email = row.get("email") or row.get("recipient_email", "")
            email = email.strip().lower()
            if not email or "@" not in email:
                skipped += 1
                continue
            name = row.get("recipient_name") or row.get("name", "")
            bulk_list.append(RecipientList(
                campaign=campaign,
                email=email,
                name=name,
                raw_data=row,
                status=RecipientList.Status.PENDING,
            ))

        RecipientList.objects.bulk_create(bulk_list, ignore_conflicts=True)
        created = len(bulk_list)

        Campaign.objects.filter(pk=campaign_id).update(
            total_recipients=RecipientList.objects.filter(campaign=campaign).count()
        )

        return Response({
            "message": f"Imported {created} recipients.",
            "created": created,
            "skipped": skipped,
        })


class RecipientBulkUpdateView(APIView):
    """
    POST /api/recipients/campaigns/<campaign_id>/recipients/bulk-update/
    Clear and re-populate the entire recipient list for a campaign.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, campaign_id):
        try:
            campaign = Campaign.objects.get(pk=campaign_id, user=request.user)
        except Campaign.DoesNotExist:
            return Response({"error": True, "message": "Campaign not found."}, status=404)

        rows = request.data.get("recipients", [])
        deleted_ids = request.data.get("deleted_ids", [])
        
        if not isinstance(rows, list):
            return Response({"error": True, "message": "Invalid payload format. Expected list under 'recipients'."}, status=400)
            
        if not isinstance(deleted_ids, list):
            return Response({"error": True, "message": "Invalid payload format. Expected list under 'deleted_ids'."}, status=400)

        # Handle deletions
        if deleted_ids:
            RecipientList.objects.filter(campaign=campaign, id__in=deleted_ids).delete()

        # Gather existing recipients to update
        existing_recipients = {
            r.id: r
            for r in RecipientList.objects.filter(campaign=campaign)
        }
        
        # We also need a way to look up by email in case an existing recipient is added without an ID
        existing_by_email = {
            r.email.lower(): r
            for r in existing_recipients.values()
        }

        emails_seen = set()
        skipped = 0
        new_recipients = []
        updated_recipients = []

        for row in rows:
            email = row.get("email", "").strip().lower()
            if not email or "@" not in email:
                skipped += 1
                continue

            if email in emails_seen:
                # Deduplicate
                continue
            emails_seen.add(email)

            name = row.get("name", "").strip()
            row_id = row.get("id")
            
            existing = None
            if row_id and int(row_id) in existing_recipients:
                existing = existing_recipients[int(row_id)]
            elif email in existing_by_email:
                existing = existing_by_email[email]

            if existing:
                existing.email = email
                existing.name = name
                raw_data = existing.raw_data or {}
                
                # Copy all other columns/variables
                for k, v in row.items():
                    if k not in ["email", "name", "id", "campaign", "status", "error_message", "sent_at", "created_at", "is_opened", "opened_at", "opened_count"]:
                        raw_data[k] = str(v).strip()
                existing.raw_data = raw_data
                updated_recipients.append(existing)
            else:
                raw_data = {
                    "email": email,
                    "recipient_email": email,
                    "name": name,
                    "recipient_name": name,
                }
                
                # Copy all other columns/variables
                for k, v in row.items():
                    if k not in ["email", "name", "id", "campaign", "status", "error_message", "sent_at", "created_at", "is_opened", "opened_at", "opened_count"]:
                        raw_data[k] = str(v).strip()

                new_recipients.append(RecipientList(
                    campaign=campaign,
                    email=email,
                    name=name,
                    raw_data=raw_data,
                    status=RecipientList.Status.PENDING,
                    sent_at=None,
                    error_message="",
                    is_opened=False,
                    opened_at=None,
                    opened_count=0,
                ))

        if new_recipients:
            RecipientList.objects.bulk_create(new_recipients, ignore_conflicts=True)
            
        if updated_recipients:
            RecipientList.objects.bulk_update(updated_recipients, fields=['email', 'name', 'raw_data'])

        total = RecipientList.objects.filter(campaign=campaign).count()

        # Check if there are any pending recipients in the new/updated list
        has_pending = any(r.status == RecipientList.Status.PENDING for r in new_recipients + updated_recipients)

        if has_pending and campaign.status in [Campaign.Status.DONE, Campaign.Status.CANCELLED, Campaign.Status.FAILED]:
            campaign.status = Campaign.Status.DRAFT
            campaign.save(update_fields=["total_recipients", "status"])
        else:
            campaign.total_recipients = total
            campaign.save(update_fields=["total_recipients"])

        # Sync changes back to Google Sheets if enabled
        sheet_sync_warning = None
        if campaign.google_sheet_sync_enabled and campaign.google_sheet_id:
            from apps.campaigns.services.google_sheets import GoogleSheetsService
            sheet_service = GoogleSheetsService()
            try:
                headers = list(campaign.column_mapping.keys()) if campaign.column_mapping else ["Email", "Name"]
                sheet_service.update_sheet_rows(
                    user=request.user,
                    spreadsheet_id=campaign.google_sheet_id,
                    headers=headers,
                    rows=rows,
                    column_mapping=campaign.column_mapping
                )
            except Exception as exc:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(
                    "Failed to sync local recipient updates back to Google Sheet %s: %s",
                    campaign.google_sheet_id,
                    exc
                )
                sheet_sync_warning = f"Locally saved, but failed to update linked Google Sheet: {exc}"

        return Response({
            "message": f"Updated {len(updated_recipients)} and added {len(new_recipients)} recipients.",
            "total_recipients": total,
            "sheet_sync_warning": sheet_sync_warning,
        })


class TrackingPixelView(APIView):
    """
    GET /api/recipients/track/<token>/
    Serve a 1x1 transparent GIF and record the email open event.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, token, *args, **kwargs):
        signer = Signer()
        try:
            recipient_id_str = signer.unsign(token)
            recipient_id = int(recipient_id_str)
            recipient = RecipientList.objects.get(pk=recipient_id)

            if not recipient.is_opened:
                recipient.is_opened = True
                recipient.opened_at = timezone.now()
                
                # Atomically increment the campaign opened_count
                campaign = recipient.campaign
                from django.db.models import F
                campaign.opened_count = F("opened_count") + 1
                campaign.save(update_fields=["opened_count"])

            recipient.opened_count += 1
            recipient.save(update_fields=["is_opened", "opened_at", "opened_count"])

        except (ValueError, BadSignature, RecipientList.DoesNotExist):
            pass

        # Return 1x1 transparent GIF
        pixel_data = base64.b64decode("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7")
        return HttpResponse(pixel_data, content_type="image/gif")


class RecipientResendView(APIView):
    """
    POST /api/recipients/<recipient_id>/resend/
    Marks a recipient as pending and restarts/resumes the campaign if it is not currently running.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            recipient = RecipientList.objects.select_related("campaign").get(pk=pk, campaign__user=request.user)
        except RecipientList.DoesNotExist:
            return Response({"error": True, "message": "Recipient not found."}, status=404)

        campaign = recipient.campaign

        if campaign.status in [Campaign.Status.RUNNING, Campaign.Status.QUEUED]:
            return Response(
                {"error": True, "message": "Cannot resend while the campaign is running or queued."},
                status=400,
            )

        old_status = recipient.status
        recipient.status = RecipientList.Status.PENDING
        recipient.error_message = ""
        recipient.save(update_fields=["status", "error_message"])

        # Adjust campaign counters immediately
        from django.db.models import F
        update_fields = []
        if old_status == RecipientList.Status.SENT:
            campaign.sent_count = F("sent_count") - 1
            update_fields.append("sent_count")
        elif old_status == RecipientList.Status.FAILED:
            campaign.failed_count = F("failed_count") - 1
            update_fields.append("failed_count")

        # Start the campaign
        from apps.campaigns.tasks import send_campaign_emails
        task = send_campaign_emails.apply_async(args=[campaign.id], queue="emails")
        campaign.status = Campaign.Status.QUEUED
        campaign.celery_task_id = task.id
        update_fields.extend(["status", "celery_task_id"])
        
        campaign.save(update_fields=update_fields)

        return Response({
            "message": f"Resend request queued for {recipient.email}.",
            "recipient_id": recipient.id,
            "campaign_status": campaign.status
        })


class RetryAllFailedView(APIView):
    """
    POST /api/recipients/campaigns/<campaign_id>/recipients/retry-failed/
    Reset every failed recipient back to pending and re-queue the campaign.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, campaign_id):
        try:
            campaign = Campaign.objects.get(pk=campaign_id, user=request.user)
        except Campaign.DoesNotExist:
            return Response({"error": True, "message": "Campaign not found."}, status=404)

        if campaign.status in [Campaign.Status.RUNNING, Campaign.Status.QUEUED]:
            return Response(
                {"error": True, "message": "Cannot retry while campaign is running or queued."},
                status=400,
            )

        updated = RecipientList.objects.filter(
            campaign=campaign,
            status=RecipientList.Status.FAILED,
        ).update(status=RecipientList.Status.PENDING, error_message="")

        if updated == 0:
            return Response({"error": True, "message": "No failed recipients to retry."}, status=400)

        from django.db.models import F
        campaign.failed_count = 0
        campaign.status = Campaign.Status.QUEUED

        from apps.campaigns.tasks import send_campaign_emails
        task = send_campaign_emails.apply_async(args=[campaign.id], queue="emails")
        campaign.celery_task_id = task.id
        campaign.save(update_fields=["failed_count", "status", "celery_task_id"])

        return Response({
            "message": f"Retrying {updated} failed recipient(s). Campaign re-queued.",
            "retried": updated,
        })

