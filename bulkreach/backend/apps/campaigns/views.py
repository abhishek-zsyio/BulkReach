"""Campaigns app — API views."""
import logging
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from utils.permissions import IsOwner
from .models import Campaign, EmailTemplate, JobApplication
from .serializers import (
    CampaignSerializer,
    CampaignListSerializer,
    EmailTemplateSerializer,
    EmailTemplateListSerializer,
    SpreadsheetUploadSerializer,
    ColumnMappingSerializer,
    JobApplicationSerializer,
)
from .services.spreadsheet_parser import SpreadsheetParser
from .services.template_renderer import TemplateRenderer
import json
from apps.accounts.models import UserResume
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)


# ─── Shared Helper ───────────────────────────────────────────────────────────

def get_campaign_or_404(pk, user):
    """Return the campaign owned by user, or a 404 Response if not found."""
    try:
        return Campaign.objects.get(pk=pk, user=user), None
    except Campaign.DoesNotExist:
        return None, Response(
            {"error": True, "message": "Campaign not found."}, status=404
        )


# ─── Campaign Views ───────────────────────────────────────────────────────────

class CampaignListCreateView(ListCreateAPIView):
    """GET /api/campaigns/  POST /api/campaigns/"""

    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Campaign.objects.filter(user=self.request.user).select_related("template")

    def get_serializer_class(self):
        if self.request.method == "GET":
            return CampaignListSerializer
        return CampaignSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class CampaignDetailView(RetrieveUpdateDestroyAPIView):
    """GET / PATCH / DELETE /api/campaigns/:id/"""

    permission_classes = [IsAuthenticated, IsOwner]
    serializer_class = CampaignSerializer

    def get_queryset(self):
        return Campaign.objects.filter(user=self.request.user).select_related("template")


class CampaignStartView(APIView):
    """POST /api/campaigns/:id/start/ — enqueue Celery bulk send task."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        campaign, error = get_campaign_or_404(pk, request.user)
        if error:
            return error

        if campaign.status not in (
            Campaign.Status.DRAFT,
            Campaign.Status.PAUSED,
            Campaign.Status.CANCELLED,
            Campaign.Status.FAILED,
        ):
            return Response(
                {"error": True, "message": f"Cannot start a campaign in '{campaign.status}' status."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not campaign.template:
            return Response({"error": True, "message": "Campaign has no email template."}, status=400)
        if not campaign.column_mapping:
            return Response(
                {"error": True, "message": "Column mapping not set. Upload and map a spreadsheet first."},
                status=400,
            )

        if campaign.status == Campaign.Status.FAILED:
            from apps.recipients.models import RecipientList
            campaign.recipients.filter(status=RecipientList.Status.FAILED).update(
                status=RecipientList.Status.PENDING
            )
            campaign.failed_count = 0

        from .tasks import send_campaign_emails
        task = send_campaign_emails.apply_async(args=[campaign.id], queue="emails")

        campaign.status = Campaign.Status.QUEUED
        campaign.celery_task_id = task.id
        campaign.started_at = timezone.now()
        campaign.save(update_fields=["status", "celery_task_id", "started_at", "failed_count"])

        return Response(
            {"message": "Campaign queued successfully.", "task_id": task.id},
            status=status.HTTP_202_ACCEPTED,
        )


class CampaignPauseView(APIView):
    """POST /api/campaigns/:id/pause/"""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        campaign, error = get_campaign_or_404(pk, request.user)
        if error:
            return error

        if campaign.status != Campaign.Status.RUNNING:
            return Response({"error": True, "message": "Only running campaigns can be paused."}, status=400)

        campaign.status = Campaign.Status.PAUSED
        campaign.save(update_fields=["status"])
        return Response({"message": "Campaign paused."})


class CampaignCancelView(APIView):
    """POST /api/campaigns/:id/cancel/"""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        campaign, error = get_campaign_or_404(pk, request.user)
        if error:
            return error

        if campaign.status in (Campaign.Status.DONE, Campaign.Status.CANCELLED):
            return Response({"error": True, "message": "Campaign is already finished."}, status=400)

        # Revoke Celery task if still running
        if campaign.celery_task_id:
            from config.celery import app as celery_app
            celery_app.control.revoke(campaign.celery_task_id, terminate=True)

        campaign.status = Campaign.Status.CANCELLED
        campaign.completed_at = timezone.now()
        campaign.save(update_fields=["status", "completed_at"])
        return Response({"message": "Campaign cancelled."})


class SpreadsheetUploadView(APIView):
    """POST /api/campaigns/:id/upload-spreadsheet/ — parse and return column preview."""

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        campaign, error = get_campaign_or_404(pk, request.user)
        if error:
            return error

        serializer = SpreadsheetUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uploaded_file = serializer.validated_data["file"]
        campaign.spreadsheet_file = uploaded_file
        campaign.save(update_fields=["spreadsheet_file"])

        parser = SpreadsheetParser()
        try:
            result = parser.parse_preview(campaign.spreadsheet_file.path)
        except Exception as exc:
            logger.error("Spreadsheet parse error for campaign %s: %s", pk, exc)
            return Response({"error": True, "message": str(exc)}, status=400)

        return Response(result)


class ColumnMappingView(APIView):
    """POST /api/campaigns/:id/map-columns/ — save column→variable mapping."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        campaign, error = get_campaign_or_404(pk, request.user)
        if error:
            return error

        serializer = ColumnMappingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        campaign.column_mapping = serializer.validated_data["mapping"]
        campaign.save(update_fields=["column_mapping"])

        return Response({"message": "Column mapping saved.", "mapping": campaign.column_mapping})


# ─── Email Template Views ─────────────────────────────────────────────────────

class TemplateListCreateView(ListCreateAPIView):
    """GET /api/templates/  POST /api/templates/"""

    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return EmailTemplate.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.request.method == "GET":
            return EmailTemplateListSerializer
        return EmailTemplateSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class TemplateDetailView(RetrieveUpdateDestroyAPIView):
    """GET / PUT / DELETE /api/templates/:id/"""

    permission_classes = [IsAuthenticated, IsOwner]
    serializer_class = EmailTemplateSerializer

    def get_queryset(self):
        return EmailTemplate.objects.filter(user=self.request.user)


class TemplatePreviewView(APIView):
    """POST /api/templates/:id/preview/ — render template with sample data."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            template = EmailTemplate.objects.get(pk=pk, user=request.user)
        except EmailTemplate.DoesNotExist:
            return Response({"error": True, "message": "Template not found."}, status=404)

        sample_data = request.data.get("sample_data", {})

        # Inject standard sender variables for the preview
        sample_data["sender_name"] = getattr(request.user, "sender_name", "") or request.user.username
        sample_data["sender_email"] = request.user.email

        renderer = TemplateRenderer()
        try:
            rendered_html = renderer.render(template.html_body, sample_data)
            rendered_subject = renderer.render(
                request.data.get("subject", ""), sample_data
            )
        except Exception as exc:
            return Response({"error": True, "message": f"Render error: {exc}"}, status=400)

        return Response({"html": rendered_html, "subject": rendered_subject})


class TemplateGenerateView(APIView):
    """POST /api/templates/generate/ — generate email template using Gemini."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        api_key = user.gemini_api_key
        if not api_key:
            return Response(
                {
                    "error": True,
                    "message": "Gemini API key is not configured. Please set your Gemini key in Profile Settings first.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        job_role = request.data.get("job_role", "").strip()
        if not job_role:
            return Response(
                {"error": True, "message": "Job role/title is required for AI generation."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        resume_id = request.data.get("resume_id")

        resume_text = ""
        if resume_id:
            try:
                resume = UserResume.objects.filter(user=user, id=resume_id).first()
                if resume:
                    resume_text = resume.parsed_text
            except Exception:
                pass

        if not resume_text:
            # Try default resume
            default_resume = UserResume.objects.filter(user=user, is_default=True).first()
            if default_resume:
                resume_text = default_resume.parsed_text
            else:
                resume_text = user.resume_text

        # Call Gemini
        try:
            client = genai.Client(api_key=api_key)
            prompt = f"""
You are a master copywriter and elite email outreach specialist.
Your task is to generate a highly personalized cold outreach email template based on:
1. Target Job Role: {job_role}
2. Candidate's Resume details: {resume_text or "No resume provided. Write a professional outreach message based on the job role."}

Your response must be valid JSON matching the following structure:
{{
  "subject": "Email subject line (use placeholders like {{{{ company_name }}}} or {{{{ job_title }}}})",
  "html_body": "Stunning HTML email layout using neobrutalist Flat & Sharp Tech aesthetic. Use clean HTML with inline styles only. CRITICAL STYLE RULES: (1) The header banner <tr> or <td> must use BOTH background-color AND background-image with a 135deg linear-gradient. Choose one pair: Blue-Purple (#2563eb to #7c3aed), Indigo-Fuchsia (#6366f1 to #d946ef), Emerald-Blue (#059669 to #3b82f6), Amber-Orange (#f59e0b to #ea580c), or Rose-Red (#ef4444 to #b91c1c). Example: style='background-color:#2563eb;background-image:linear-gradient(135deg,#2563eb 0%,#7c3aed 100%)'. (2) The CTA button <td> must also use the same gradient pair with border:2px solid #0f172a and box-shadow:3px 3px 0px 0px #0f172a. (3) Include a highlight card <table> with background:#f1f5f9;border:2px solid #0f172a for key strengths. (4) Footer with background:#f8fafc;border-top:2px solid #0f172a."
}}

Guidelines for Placeholders:
- The email is a general outreach template to be sent to MULTIPLE different companies. Therefore, you must NOT hardcode any specific company name, recipient name, or sender name.
- Instead, you MUST use the following exact double curly brace placeholder variables in the text and HTML structure:
  * `{{{{ recipient_name }}}}` for the hiring manager or recruiter name.
  * `{{{{ company_name }}}}` for the target company.
  * `{{{{ job_title }}}}` for the target job title.
  * `{{{{ sender_name }}}}` for the candidate's signature name.
- Tailor the email's value propositions to highlight relevant skills from the candidate's resume that match the job role.
- Keep the tone professional, bold, and modern.
"""
            response = client.models.generate_content(
                model=getattr(request.user, "gemini_model", "gemini-3.5-flash") or "gemini-3.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                ),
            )

            generated_data = json.loads(response.text)
            return Response(generated_data)
        except Exception as exc:
            logger.exception("Failed to generate template via Gemini: %s", exc)
            err_str = str(exc).lower()
            if "429" in err_str or "resource_exhausted" in err_str or "quota" in err_str:
                return Response(
                    {"error": True, "message": "Gemini API quota exceeded or rate limit reached. Please wait a moment or check your Gemini API key billing settings."},
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )
            elif "503" in err_str or "unavailable" in err_str or "demand" in err_str:
                return Response(
                    {"error": True, "message": "Gemini API is temporarily experiencing high demand (503 Service Unavailable). Please try again in a few moments."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )
            return Response(
                {"error": True, "message": f"Gemini generation failed: {str(exc)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class CampaignCreateGoogleSheetView(APIView):
    """POST /api/campaigns/:id/google-sheet/create/ — create a spreadsheet in Google Drive and link it."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        campaign, error = get_campaign_or_404(pk, request.user)
        if error:
            return error

        if not campaign.template:
            return Response(
                {"error": True, "message": "Please select an email template for this campaign first."},
                status=400,
            )

        # Retrieve available variables from the email template
        variables = campaign.template.available_variables or []

        # Build headers list (Email and Name are mandatory first columns)
        headers = ["email", "name"]
        for var in variables:
            var_clean = var.strip().lower()
            if var_clean not in headers:
                headers.append(var_clean)

        from .services.google_sheets import GoogleSheetsService
        service = GoogleSheetsService()
        try:
            sheet_id, sheet_url = service.create_campaign_sheet(
                user=request.user,
                campaign_name=campaign.name,
                headers=headers,
            )
        except Exception as exc:
            logger.exception("Failed to create Google Spreadsheet for campaign %s: %s", pk, exc)
            return Response({"error": True, "message": f"Google Sheets API Error: {exc}"}, status=400)

        # Automatically map headers to variables
        mapping = {}
        for h in headers:
            display_header = h.title()
            var_name = h
            # map name to recipient_name to match recipient model
            if h == "name":
                var_name = "recipient_name"
            mapping[display_header] = var_name

        campaign.google_sheet_id = sheet_id
        campaign.google_sheet_sync_enabled = True
        campaign.column_mapping = mapping
        campaign.save(update_fields=["google_sheet_id", "google_sheet_sync_enabled", "column_mapping"])

        return Response(
            {
                "message": "Google Sheet created and linked successfully.",
                "google_sheet_id": sheet_id,
                "spreadsheet_url": sheet_url,
                "column_mapping": mapping,
            }
        )


class CampaignSyncGoogleSheetView(APIView):
    """POST /api/campaigns/:id/google-sheet/sync/ — pull recipients from the linked Google Sheet."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        campaign, error = get_campaign_or_404(pk, request.user)
        if error:
            return error

        if not campaign.google_sheet_id or not campaign.google_sheet_sync_enabled:
            return Response(
                {"error": True, "message": "Google Sheet sync is not enabled for this campaign."},
                status=400,
            )

        from .services.google_sheets import GoogleSheetsService
        from apps.recipients.models import RecipientList

        service = GoogleSheetsService()
        try:
            rows = service.fetch_sheet_rows(
                user=request.user,
                spreadsheet_id=campaign.google_sheet_id,
                column_mapping=campaign.column_mapping,
            )
        except Exception as exc:
            logger.exception("Failed to sync Google Spreadsheet for campaign %s: %s", pk, exc)
            return Response({"error": True, "message": f"Google Sheets Sync Error: {exc}"}, status=400)

        # Clear existing pending recipients before re-import
        RecipientList.objects.filter(campaign=campaign, status=RecipientList.Status.PENDING).delete()

        skipped = 0
        bulk_list = []

        for row in rows:
            email = row.get("email")
            if email:
                email = email.strip().lower()
            if not email or "@" not in email:
                skipped += 1
                continue
            name = row.get("recipient_name") or row.get("name", "")
            bulk_list.append(
                RecipientList(
                    campaign=campaign,
                    email=email,
                    name=name,
                    raw_data=row,
                    status=RecipientList.Status.PENDING,
                )
            )

        RecipientList.objects.bulk_create(bulk_list, ignore_conflicts=True)
        created = len(bulk_list)

        # Use the bulk_list length directly — avoids an extra COUNT(*) query
        campaign.total_recipients = (
            RecipientList.objects.filter(campaign=campaign).count()
        )
        campaign.save(update_fields=["total_recipients"])

        return Response(
            {
                "message": f"Synced {created} recipients from Google Sheet.",
                "created": created,
                "skipped": skipped,
            }
        )


class JobApplicationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = JobApplicationSerializer
    pagination_class = None

    def get_queryset(self):
        return JobApplication.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["post"], url_path="bulk-delete")
    def bulk_delete(self, request):
        ids = request.data.get("ids", [])
        stage = request.data.get("stage", None)

        queryset = self.get_queryset()

        if ids:
            deleted_count, _ = queryset.filter(id__in=ids).delete()
            message = f"Successfully deleted {deleted_count} applications."
        elif stage:
            deleted_count, _ = queryset.filter(stage=stage).delete()
            message = f"Successfully cleared {deleted_count} applications from stage '{stage}'."
        else:
            return Response(
                {"error": True, "message": "Specify 'ids' list or 'stage' to delete."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({"success": True, "message": message, "deleted_count": deleted_count})

