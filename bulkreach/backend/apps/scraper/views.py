"""Scraper app — views (Phase 2)."""
import logging
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import ScrapeJob, ScrapedContact, CompanyEnrichment, CompanyEmployee, ProfileResearch
from .serializers import (
    ScrapeJobSerializer,
    ScrapeJobCreateSerializer,
    ScrapeJobResultsSerializer,
    ScrapeJobImportSerializer,
    ScrapedContactSerializer,
    CompanyEmployeeSerializer,
    CompanyEnrichmentSerializer,
    CompanyEnrichmentCreateSerializer,
    CompanyImportSerializer,
    ProfileResearchSerializer,
)
from utils.pagination import StandardResultsPagination

from django.db import IntegrityError

logger = logging.getLogger(__name__)


class ScrapeJobListCreateView(APIView):
    """
    GET  /api/scraper/jobs/  — list all scrape jobs for the authenticated user
    POST /api/scraper/jobs/  — trigger a new scrape job
    DELETE /api/scraper/jobs/ — clear all scrape jobs
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        jobs = ScrapeJob.objects.filter(user=request.user)
        serializer = ScrapeJobSerializer(jobs, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = ScrapeJobCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": True, "message": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data
        
        campaign_id = data["campaign_id"]
        from apps.campaigns.models import Campaign
        try:
            campaign = Campaign.objects.get(pk=campaign_id, user=request.user)
        except Campaign.DoesNotExist:
            return Response(
                {"error": True, "message": "Campaign not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        job = ScrapeJob.objects.create(
            user=request.user,
            platform=data["platform"],
            keywords=data["keywords"],
            location=data.get("location", ""),
            max_results=data.get("max_results", 50),
            campaign=campaign,
            use_ai_matching=data.get("use_ai_matching", True),
            freshness=data.get("freshness", "any"),
            company_size=data.get("company_size", "any"),
        )

        from .tasks import run_scrape_job
        task = run_scrape_job.apply_async(args=[job.id], queue="scraping")
        job.celery_task_id = task.id
        job.save(update_fields=["celery_task_id"])

        return Response(
            {
                "id": job.id,
                "message": "Scrape job started.",
                "task_id": task.id,
                "job": ScrapeJobSerializer(job).data,
            },
            status=status.HTTP_202_ACCEPTED,
        )

    def delete(self, request):
        """
        DELETE /api/scraper/jobs/  — clear all scrape jobs for the authenticated user
        """
        running_jobs = ScrapeJob.objects.filter(
            user=request.user,
            status__in=[ScrapeJob.Status.PENDING, ScrapeJob.Status.RUNNING]
        )
        for job in running_jobs:
            if job.celery_task_id:
                try:
                    from config.celery import app as celery_app
                    celery_app.control.revoke(job.celery_task_id, terminate=True)
                except Exception as e:
                    logger.warning(
                        "Failed to revoke celery task %s during bulk deletion: %s",
                        job.celery_task_id,
                        e,
                    )

        ScrapeJob.objects.filter(user=request.user).delete()
        return Response(
            {"message": "All scrape jobs cleared successfully."},
            status=status.HTTP_200_OK,
        )


class ScrapeJobDetailView(APIView):
    """
    GET /api/scraper/jobs/:id/ — Returns live status of a scrape job
    DELETE /api/scraper/jobs/:id/ — Deletes a scrape job and its results
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            job = ScrapeJob.objects.get(pk=pk, user=request.user)
        except ScrapeJob.DoesNotExist:
            return Response(
                {"error": True, "message": "Scrape job not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(ScrapeJobSerializer(job).data)

    def delete(self, request, pk):
        """
        DELETE /api/scraper/jobs/:id/  — delete a specific scrape job
        """
        try:
            job = ScrapeJob.objects.get(pk=pk, user=request.user)
        except ScrapeJob.DoesNotExist:
            return Response(
                {"error": True, "message": "Scrape job not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if job.status in [ScrapeJob.Status.PENDING, ScrapeJob.Status.RUNNING] and job.celery_task_id:
            try:
                from config.celery import app as celery_app
                celery_app.control.revoke(job.celery_task_id, terminate=True)
            except Exception as e:
                logger.warning(
                    "Failed to revoke celery task %s during deletion: %s",
                    job.celery_task_id,
                    e,
                )

        job.delete()
        return Response(
            {"message": "Scrape job deleted successfully."},
            status=status.HTTP_200_OK,
        )


class ScrapeJobResultsView(APIView):
    """
    GET /api/scraper/jobs/:id/results/
    Returns the job header + all scraped contacts (paginated).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            job = ScrapeJob.objects.get(pk=pk, user=request.user)
        except ScrapeJob.DoesNotExist:
            return Response(
                {"error": True, "message": "Scrape job not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        contacts_qs = job.contacts.all()

        ordering = request.query_params.get("ordering", "").strip()
        sort_by_posted_date = False
        reverse_posted_date = False
        if ordering == "posted_date":
            sort_by_posted_date = True
            reverse_posted_date = True  # Oldest first (larger days value first)
        elif ordering == "-posted_date":
            sort_by_posted_date = True
            reverse_posted_date = False  # Newest first (smaller days value first)

        if not sort_by_posted_date:
            if ordering in ["created_at", "-created_at", "id", "-id", "name", "-name"]:
                contacts_qs = contacts_qs.order_by(ordering)
            else:
                contacts_qs = contacts_qs.order_by("-id")

        # Optional search filter
        search = request.query_params.get("search", "").strip()
        if search:
            from django.db.models import Q
            contacts_qs = contacts_qs.filter(
                Q(name__icontains=search)
                | Q(company__icontains=search)
                | Q(job_title__icontains=search)
                | Q(email__icontains=search)
            )

        # Additional query parameter filters
        has_email = request.query_params.get("has_email", "").strip().lower()
        if has_email == "true":
            contacts_qs = contacts_qs.exclude(email="")

        has_recruiter = request.query_params.get("has_recruiter", "").strip().lower()
        if has_recruiter == "true":
            contacts_qs = contacts_qs.exclude(name="Hiring Manager").exclude(name="")

        location_filter = request.query_params.get("location", "").strip()
        if location_filter:
            contacts_qs = contacts_qs.filter(location__icontains=location_filter)

        salary_filter = request.query_params.get("salary", "").strip()
        if salary_filter:
            contacts_qs = contacts_qs.filter(salary__icontains=salary_filter)

        if sort_by_posted_date:
            import re
            def parse_relative_date_to_days(date_str):
                if not date_str:
                    return 999999
                date_lower = date_str.lower().strip()
                if any(w in date_lower for w in ["now", "today", "hour", "minute"]):
                    return 0
                if "yesterday" in date_lower:
                    return 1
                
                digits = re.findall(r'\d+', date_lower)
                val = int(digits[0]) if digits else 1
                
                if "day" in date_lower:
                    return val
                elif "week" in date_lower:
                    return val * 7
                elif "month" in date_lower:
                    return val * 30
                elif "year" in date_lower:
                    return val * 365
                return 999999

            contacts_list = list(contacts_qs)
            
            # Separate contacts with posted date and without to keep missing dates at bottom
            has_date_list = [c for c in contacts_list if c.posted_date]
            no_date_list = [c for c in contacts_list if not c.posted_date]
            
            has_date_list.sort(key=lambda c: parse_relative_date_to_days(c.posted_date), reverse=reverse_posted_date)
            contacts_list = has_date_list + no_date_list
        else:
            contacts_list = contacts_qs

        # Pagination
        paginator = StandardResultsPagination()
        paginator.page_size = int(request.query_params.get("page_size", 100))
        page = paginator.paginate_queryset(contacts_list, request)

        contacts_serializer = ScrapedContactSerializer(page, many=True)
        return Response({
            "job": ScrapeJobSerializer(job).data,
            "contacts": contacts_serializer.data,
            "count": paginator.page.paginator.count,
        })


class ScrapeJobImportView(APIView):
    """
    POST /api/scraper/jobs/:id/import/
    Imports scraped contacts (those with an email) into an existing campaign as RecipientList rows.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            job = ScrapeJob.objects.get(pk=pk, user=request.user)
        except ScrapeJob.DoesNotExist:
            return Response(
                {"error": True, "message": "Scrape job not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ScrapeJobImportSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": True, "message": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        campaign_id = serializer.validated_data["campaign_id"]

        from apps.campaigns.models import Campaign
        from apps.recipients.models import RecipientList

        try:
            campaign = Campaign.objects.get(pk=campaign_id, user=request.user)
        except Campaign.DoesNotExist:
            return Response(
                {"error": True, "message": "Campaign not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        previous_count = campaign.recipients.count()
        existing_emails = set(
            campaign.recipients.values_list("email", flat=True)
        )
        existing_emails_lower = {email.lower() for email in existing_emails}

        # Import all contacts — even those without email (use deterministic placeholder to avoid unique constraint)
        contacts = job.contacts.all()
        bulk_list = []
        new_raw_datas = []
        for c in contacts:
            email_val = c.email.strip() if c.email else f"scraped_{c.id}@unresolved.local"
            if email_val.lower() in existing_emails_lower:
                continue
            
            raw_data = {
                "email": c.email,
                "recipient_name": c.name,
                "company_name": c.company,
                "job_title": c.job_title,
                "linkedin_url": c.linkedin_url,
                "source_url": c.source_url,
            }
            if c.custom_variables:
                raw_data.update(c.custom_variables)

            bulk_list.append(
                RecipientList(
                    campaign=campaign,
                    email=email_val,
                    name=c.name,
                    raw_data=raw_data,
                )
            )
            new_raw_datas.append(raw_data)

        if bulk_list:
            RecipientList.objects.bulk_create(bulk_list, ignore_conflicts=True)

        # Create saved job applications for each new contact imported
        from apps.campaigns.models import JobApplication
        job_apps_to_create = []
        for c in contacts:
            if not JobApplication.objects.filter(
                user=request.user,
                company_name=c.company or "Unknown",
                job_title=c.job_title or "Position",
            ).exists():
                job_apps_to_create.append(
                    JobApplication(
                        user=request.user,
                        company_name=c.company or "Unknown",
                        job_title=c.job_title or "Position",
                        stage=JobApplication.Stage.SAVED,
                        contact_name=c.name or "Hiring Manager",
                        contact_email=c.email or "",
                        job_url=c.source_url or "",
                        linkedin_url=c.linkedin_url or "",
                        campaign=campaign,
                    )
                )

        if job_apps_to_create:
            JobApplication.objects.bulk_create(job_apps_to_create, ignore_conflicts=True)

        # Update campaign total_recipients and calculate actual inserted count
        current_count = campaign.recipients.count()
        created_count = current_count - previous_count
        Campaign.objects.filter(pk=campaign_id).update(total_recipients=current_count)

        # If the campaign uses a Google Sheet, push these new contacts up to the sheet
        if campaign.google_sheet_sync_enabled and campaign.google_sheet_id and new_raw_datas:
            try:
                from apps.campaigns.services.google_sheets import GoogleSheetsService
                sheet_service = GoogleSheetsService()
                
                # Fetch existing rows so we don't overwrite them
                existing_rows = sheet_service.fetch_sheet_rows(
                    user=request.user,
                    spreadsheet_id=campaign.google_sheet_id,
                    column_mapping=campaign.column_mapping
                )
                
                # Append only the newly imported scraped contacts
                existing_rows.extend(new_raw_datas)
                
                # Update the sheet
                headers = list(campaign.column_mapping.keys()) if campaign.column_mapping else ["Email", "Name"]
                sheet_service.update_sheet_rows(
                    user=request.user,
                    spreadsheet_id=campaign.google_sheet_id,
                    headers=headers,
                    rows=existing_rows,
                    column_mapping=campaign.column_mapping
                )
            except Exception as exc:
                logger.warning(
                    "Failed to sync newly imported scraped contacts to Google Sheet %s: %s",
                    campaign.google_sheet_id,
                    exc
                )

        logger.info(
            "Imported %d new contacts from ScrapeJob %d into Campaign %d",
            created_count, job.id, campaign.id,
        )

        return Response(
            {
                "message": f"Imported {created_count} contacts into campaign '{campaign.name}'.",
                "count": created_count,
                "campaign_id": campaign_id,
                "campaign_name": campaign.name,
            }
        )


class ScrapeJobExportView(APIView):
    """
    GET /api/scraper/jobs/:id/export/
    Downloads all scraped contacts as a CSV file.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        import csv
        from django.http import StreamingHttpResponse

        try:
            job = ScrapeJob.objects.get(pk=pk, user=request.user)
        except ScrapeJob.DoesNotExist:
            return Response(
                {"error": True, "message": "Scrape job not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        contacts = job.contacts.all().values_list(
            "name", "email", "company", "job_title", "linkedin_url", "source_url"
        )

        def generate():
            yield "Name,Email,Company,Job Title,LinkedIn URL,Source URL\n"
            for row in contacts:
                yield ",".join(f'"{str(val).replace(chr(34), chr(39))}"' for val in row) + "\n"

        filename = f"bulkreach_scrape_{job.id}_{job.platform}.csv"
        response = StreamingHttpResponse(generate(), content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response


class ScrapeJobCancelView(APIView):
    """
    POST /api/scraper/jobs/:id/cancel/
    Cancels a running or pending scrape job.
    """
    
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            job = ScrapeJob.objects.get(pk=pk, user=request.user)
        except ScrapeJob.DoesNotExist:
            return Response(
                {"error": True, "message": "Scrape job not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if job.status not in [ScrapeJob.Status.PENDING, ScrapeJob.Status.RUNNING]:
            return Response(
                {"error": True, "message": f"Cannot cancel job in status '{job.status}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Try to revoke the Celery task if we have its ID
        if job.celery_task_id:
            from config.celery import app as celery_app
            celery_app.control.revoke(job.celery_task_id, terminate=True)
            
        from django.utils import timezone
        job.status = ScrapeJob.Status.FAILED
        job.error_message = "Canceled by user."
        job.completed_at = timezone.now()
        job.save(update_fields=["status", "error_message", "completed_at"])

        return Response(
            {"message": "Scrape job canceled successfully."},
            status=status.HTTP_200_OK,
        )


class ScrapeJobRetryView(APIView):
    """
    POST /api/scraper/jobs/:id/retry/
    Retries a failed or cancelled scrape job.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            job = ScrapeJob.objects.get(pk=pk, user=request.user)
        except ScrapeJob.DoesNotExist:
            return Response(
                {"error": True, "message": "Scrape job not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Clear error and reset status to PENDING
        job.status = ScrapeJob.Status.PENDING
        job.error_message = ""
        job.result_count = 0
        job.completed_at = None
        job.started_at = None
        
        # Remove any scraped contacts from previous attempt to run cleanly
        job.contacts.all().delete()
        
        job.save()

        # Trigger the celery task
        from .tasks import run_scrape_job
        task = run_scrape_job.apply_async(args=[job.id], queue="scraping")
        job.celery_task_id = task.id
        job.save(update_fields=["celery_task_id"])

        return Response(
            {
                "message": "Scrape job retried successfully.",
                "job": ScrapeJobSerializer(job).data,
            },
            status=status.HTTP_200_OK,
        )


class ScrapedContactDetailView(APIView):
    """
    PUT /api/scraper/contacts/:id/ - Edit a scraped contact's name or email manually
    """
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        try:
            contact = ScrapedContact.objects.get(pk=pk, job__user=request.user)
        except ScrapedContact.DoesNotExist:
            return Response({"error": "Contact not found."}, status=status.HTTP_404_NOT_FOUND)
        
        name = request.data.get("name")
        email = request.data.get("email")
        linkedin_url = request.data.get("linkedin_url")
        
        if name is not None:
            contact.name = name.strip()
        if email is not None:
            contact.email = email.strip()
        if linkedin_url is not None:
            contact.linkedin_url = linkedin_url.strip()
            
        contact.save()
        return Response(ScrapedContactSerializer(contact).data)

def clean_linkedin_url(url: str) -> str:
    if not url:
        return ""
    import urllib.parse
    
    # If it is a Yahoo search redirect URL, extract the destination URL
    if "yahoo.com" in url:
        if "/RU=" in url:
            parts = url.split("/RU=")
            if len(parts) > 1:
                dest = parts[1].split("/")[0]
                return urllib.parse.unquote(dest)
        parsed = urllib.parse.urlparse(url)
        query_params = urllib.parse.parse_qs(parsed.query)
        if "RU" in query_params:
            return urllib.parse.unquote(query_params["RU"][0])
            
    # If it is a DuckDuckGo redirect URL, extract destination from 'uddg'
    if "duckduckgo.com" in url:
        parsed = urllib.parse.urlparse(url)
        query_params = urllib.parse.parse_qs(parsed.query)
        if "uddg" in query_params:
            return urllib.parse.unquote(query_params["uddg"][0])
            
    return url


from pydantic import BaseModel, Field

class RecruiterJobTextExtraction(BaseModel):
    recruiter_name: str | None = Field(default=None, description="Name of the recruiter or null if not found")
    recruiter_email: str | None = Field(default=None, description="Email address or null if not found")

class RecruiterSearchExtraction(BaseModel):
    recruiter_name: str | None = Field(default=None, description="Name of the recruiter or null if not found")
    recruiter_linkedin_url: str | None = Field(default=None, description="LinkedIn URL of the recruiter or null if not found")
    recruiter_email: str | None = Field(default=None, description="Synthesized email address or null if not found")


def clean_and_parse_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        first_newline = text.find("\n")
        if first_newline != -1:
            text = text[first_newline:].strip()
        if text.endswith("```"):
            text = text[:-3].strip()
            
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace != -1:
        text = text[first_brace:last_brace+1]
        
    import json
    return json.loads(text)



class ScrapedContactExtractRecruiterView(APIView):
    """
    POST /api/scraper/contacts/:id/extract-recruiter/
    Loads the job listing URL using Playwright and uses Gemini AI to scan the text for recruiter contact info (free).
    If no recruiter info is found or page is blocked/redirected, uses a free DuckDuckGo search fallback
    to find recruiters at the company on LinkedIn and synthesizes their email.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            contact = ScrapedContact.objects.get(pk=pk, job__user=request.user)
        except ScrapedContact.DoesNotExist:
            return Response({"error": "Contact not found."}, status=status.HTTP_404_NOT_FOUND)

        url = contact.source_url
        company = contact.company or "the company"
        existing_email = contact.email or ""
        
        # Determine company domain for email synthesis fallback
        domain = "company.com"
        if existing_email and "@" in existing_email:
            domain = existing_email.split("@")[-1].strip()
        else:
            clean_company = "".join(c for c in company.lower() if c.isalnum())
            if clean_company:
                domain = f"{clean_company}.com"

        api_key = request.user.gemini_api_key
        if not api_key:
            return Response({
                "error": "Gemini API key is required. Please add it under settings to enable free AI recruiter extraction."
            }, status=status.HTTP_400_BAD_REQUEST)

        fallback_param = request.query_params.get("fallback") == "true"
        text_content = ""
        is_blocked = False

        if not fallback_param:
            # Step 1: Try Playwright extraction from source_url
            if url:
                if "linkedin.com" in url.lower():
                    logger.info("Skipping Playwright for LinkedIn URL to avoid login redirects: %s", url)
                    is_blocked = True
                else:
                    try:
                        from playwright.sync_api import sync_playwright
                        logger.info("Extracting recruiter details from URL: %s", url)
                        
                        with sync_playwright() as p:
                            browser = p.chromium.launch(
                                headless=True,
                                args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
                            )
                            context = browser.new_context(
                                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
                            )
                            page = context.new_page()
                            page.goto(url, timeout=12000, wait_until="domcontentloaded")
                            page.wait_for_timeout(2000)
                            
                            # Check for login redirection/anti-bot gate
                            current_url = page.url
                            if "login" in current_url.lower() or "signin" in current_url.lower() or "signup" in current_url.lower():
                                logger.warning("Playwright redirected to login wall: %s", current_url)
                                is_blocked = True
                            else:
                                text_content = page.locator("body").inner_text()
                            browser.close()
                    except Exception as e:
                        logger.warning("Playwright failed to fetch job URL: %s", e)
                        is_blocked = True

        from google import genai
        from google.genai import types
        import json
        
        client = genai.Client(api_key=api_key)
        rec_name = None
        rec_email = None
        rec_linkedin = None
        used_fallback = False

        if not fallback_param:
            # Step 2: Try Gemini on the job posting text if we got it
            if text_content and not is_blocked:
                try:
                    prompt = f"""
                    Analyze the following job description text scraped from {url}.
                    Your task is to identify and extract the name and email address of the Recruiter, HR Representative, or Hiring Manager responsible for this job posting.
                    
                    Job Post Text:
                    \"\"\"
                    {text_content[:10000]}
                    \"\"\"
                    
                    If you find a specific personal name (e.g. 'John Doe', 'Sarah Smith'), extract it. Do NOT extract generic words like 'Hiring Manager' or 'HR Team' unless absolutely no specific name is found.
                    If you find a direct email address (e.g. 'john.d@company.com'), extract it.
                    
                    Respond ONLY with a valid JSON object matching this structure:
                    {{
                        "recruiter_name": "Name of the recruiter or null if not found",
                        "recruiter_email": "Email address or null if not found"
                    }}
                    """
                    response = client.models.generate_content(
                        model=getattr(request.user, "gemini_model", "gemini-2.5-flash") or "gemini-2.5-flash",
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            response_schema=RecruiterJobTextExtraction,
                        )
                    )
                    result = clean_and_parse_json(response.text)
                    from apps.accounts.models import log_ai_usage
                    log_ai_usage(
                        request.user,
                        "Recruiter Details Extraction",
                        model_name=getattr(request.user, "gemini_model", "gemini-2.5-flash") or "gemini-2.5-flash"
                    )
                    name_candidate = result.get("recruiter_name")
                    email_candidate = result.get("recruiter_email")
                    
                    if name_candidate and name_candidate.strip().lower() not in ["null", "hiring manager", "hr manager", "recruiter", "talent acquisition", "anonymous", "hr team"]:
                        rec_name = name_candidate.strip()
                    if email_candidate and email_candidate.lower() != "null":
                        rec_email = email_candidate.strip()
                except Exception as e:
                    logger.warning("Gemini parsing of job text failed: %s", e)
                    err_str = str(e).lower()
                    if "429" in err_str or "resource_exhausted" in err_str or "quota" in err_str:
                        return Response({
                            "error": "Gemini API rate limit exceeded. Please wait a moment or check your Google billing info."
                        }, status=status.HTTP_429_TOO_MANY_REQUESTS)
                    elif "503" in err_str or "unavailable" in err_str or "demand" in err_str:
                        return Response({
                            "error": "Gemini API is temporarily experiencing high demand. Please try again in a few moments."
                        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
                    elif "key" in err_str or "invalid" in err_str or "400" in err_str or "403" in err_str:
                        return Response({
                            "error": "Invalid Gemini API Key or project configuration. Please check your settings."
                        }, status=status.HTTP_400_BAD_REQUEST)

        # Step 3: Fallback Search (Yahoo/DuckDuckGo + Gemini synthesis) if blocked or no recruiter found AND user authorized fallback
        if not rec_name and (fallback_param or not url):
            used_fallback = True
            logger.info("Using fallback search for company: %s", company)
            from apps.scraper.tasks import _perform_web_search
            # Search query: site:linkedin.com/in/ "Company Name" (recruiter OR "talent acquisition" OR HR)
            query = f'site:linkedin.com/in/ "{company}" (recruiter OR "talent acquisition" OR "human resources")'
            search_results = _perform_web_search(query, max_results=3)
 
            if search_results:
                try:
                    search_prompt = f"""
                    Analyze the following web search results for recruiters at "{company}".
                    Your task is to identify and extract the name and LinkedIn URL of the most relevant Recruiter, HR Personnel, or Talent Acquisition Representative at this company.
                    Additionally, based on their name, suggest/synthesize a professional email address under the company domain "{domain}".
                    
                    Company: {company}
                    Company Domain: {domain}
                    
                    Search Results:
                    {json.dumps(search_results, indent=2)}
                    
                    Instructions:
                    1. Extract the full personal name (e.g. 'John Doe', 'Sarah Smith'). Avoid generic words.
                    2. Extract the exact LinkedIn URL associated with this recruiter from the search result "link" field.
                    3. Predict/synthesize their corporate email address based on their name and the company domain "{domain}" (e.g. john.doe@{domain} or jdoe@{domain} or john@{domain}).
                    4. Respond ONLY with a valid JSON object matching this structure:
                    {{
                        "recruiter_name": "Name of the recruiter or null if not found",
                        "recruiter_linkedin_url": "LinkedIn URL of the recruiter or null if not found",
                        "recruiter_email": "Synthesized email address or null if not found"
                    }}
                    """
                    response = client.models.generate_content(
                        model=getattr(request.user, "gemini_model", "gemini-2.5-flash") or "gemini-2.5-flash",
                        contents=search_prompt,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            response_schema=RecruiterSearchExtraction,
                        )
                     )
                    result = clean_and_parse_json(response.text)
                    from apps.accounts.models import log_ai_usage
                    log_ai_usage(
                        request.user,
                        "Recruiter Web Search Extraction",
                        model_name=getattr(request.user, "gemini_model", "gemini-2.5-flash") or "gemini-2.5-flash"
                    )
                    name_candidate = result.get("recruiter_name")
                    email_candidate = result.get("recruiter_email")
                    linkedin_candidate = result.get("recruiter_linkedin_url")
                    
                    if name_candidate and name_candidate.strip().lower() not in ["null", "hiring manager", "hr manager", "recruiter", "talent acquisition", "anonymous", "hr team"]:
                        rec_name = name_candidate.strip()
                    if email_candidate and email_candidate.lower() != "null":
                        rec_email = email_candidate.strip()
                    if linkedin_candidate and linkedin_candidate.lower() != "null":
                        rec_linkedin = linkedin_candidate.strip()
                except Exception as e:
                    logger.warning("Gemini parsing of search results failed: %s", e)
                    err_str = str(e).lower()
                    if "429" in err_str or "resource_exhausted" in err_str or "quota" in err_str:
                        return Response({
                            "error": "Gemini API rate limit exceeded. Please wait a moment or check your Google billing info."
                        }, status=status.HTTP_429_TOO_MANY_REQUESTS)
                    elif "503" in err_str or "unavailable" in err_str or "demand" in err_str:
                        return Response({
                            "error": "Gemini API is temporarily experiencing high demand. Please try again in a few moments."
                        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
                    elif "key" in err_str or "invalid" in err_str or "400" in err_str or "403" in err_str:
                        return Response({
                            "error": "Invalid Gemini API Key or project configuration. Please check your settings."
                        }, status=status.HTTP_400_BAD_REQUEST)
 
        # Step 4: Apply updates
        updated = False
        if rec_name:
            contact.name = rec_name.strip()
            updated = True
            
        if rec_email:
            contact.email = rec_email.strip()
            updated = True
            
        if rec_linkedin:
            contact.linkedin_url = clean_linkedin_url(rec_linkedin.strip())
            updated = True
        else:
            # If we didn't find a recruiter linkedin URL, clear any existing non-profile url (e.g. jobs url)
            if contact.linkedin_url and "/in/" not in contact.linkedin_url:
                contact.linkedin_url = ""
                updated = True
            
        if updated:
            try:
                # Double-check that the contact and its parent job still exist to avoid race-condition FK violations
                if not ScrapedContact.objects.filter(pk=contact.pk).exists():
                    return Response({
                        "success": False,
                        "message": "The associated job posting or contact was deleted concurrently."
                    }, status=status.HTTP_400_BAD_REQUEST)
                contact.save()
            except IntegrityError as exc:
                logger.warning("Failed to save contact due to concurrent delete: %s", exc)
                return Response({
                    "success": False,
                    "message": "The associated job campaign or contact was deleted."
                }, status=status.HTTP_400_BAD_REQUEST)
            
        # Did we actually find any new recruiter details?
        found = bool(rec_name or rec_email or rec_linkedin)
        requires_fallback = not found and not fallback_param
        
        return Response({
            "success": True,
            "name": contact.name,
            "email": contact.email,
            "linkedin_url": contact.linkedin_url,
            "updated": updated,
            "found": found,
            "requires_fallback": requires_fallback,
            "used_fallback": used_fallback
        })


class CompanyEnrichmentListCreateView(APIView):
    """
    GET  /api/scraper/companies/ — List all company enrichments for this user.
    POST /api/scraper/companies/ — Start a new company enrichment task.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        enrichments = CompanyEnrichment.objects.filter(user=request.user)
        serializer = CompanyEnrichmentSerializer(enrichments, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = CompanyEnrichmentCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        api_key = getattr(request.user, "gemini_api_key", "")
        if not api_key:
            return Response(
                {"error": "Gemini API key is required. Please set it in Settings to research companies."},
                status=status.HTTP_400_BAD_REQUEST
            )

        company_name = serializer.validated_data["company_name"]
        job_titles = serializer.validated_data.get("job_titles") or []

        # Create enrichment record
        enrichment = CompanyEnrichment.objects.create(
            user=request.user,
            company_name=company_name,
            status=CompanyEnrichment.Status.PENDING
        )

        # Trigger celery task
        from apps.scraper.tasks import run_company_enrichment
        run_company_enrichment.delay(enrichment.id, job_titles)

        return Response(CompanyEnrichmentSerializer(enrichment).data, status=status.HTTP_201_CREATED)


class CompanyEnrichmentDetailView(APIView):
    """
    GET    /api/scraper/companies/<id>/ — Get detailed info and employee list.
    DELETE /api/scraper/companies/<id>/ — Delete the record.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            enrichment = CompanyEnrichment.objects.get(pk=pk, user=request.user)
        except CompanyEnrichment.DoesNotExist:
            return Response({"error": "Company research not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = CompanyEnrichmentSerializer(enrichment)
        return Response(serializer.data)

    def delete(self, request, pk):
        try:
            enrichment = CompanyEnrichment.objects.get(pk=pk, user=request.user)
        except CompanyEnrichment.DoesNotExist:
            return Response({"error": "Company research not found."}, status=status.HTTP_404_NOT_FOUND)

        enrichment.delete()
        return Response({"success": True, "message": "Company research deleted successfully."})


class CompanyEnrichmentImportView(APIView):
    """
    POST /api/scraper/companies/<id>/import/ — Import selected or all employees to a campaign.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            enrichment = CompanyEnrichment.objects.get(pk=pk, user=request.user)
        except CompanyEnrichment.DoesNotExist:
            return Response({"error": "Company research not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = CompanyImportSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        campaign_id = serializer.validated_data["campaign_id"]
        employee_ids = serializer.validated_data.get("employee_ids") or []

        from apps.campaigns.models import Campaign
        from apps.recipients.models import RecipientList

        try:
            campaign = Campaign.objects.get(pk=campaign_id, user=request.user)
        except Campaign.DoesNotExist:
            return Response({"error": "Campaign not found."}, status=status.HTTP_404_NOT_FOUND)

        # Fetch employees to import
        employees = enrichment.employees.all()
        if employee_ids:
            employees = employees.filter(id__in=employee_ids)

        previous_count = campaign.recipients.count()
        existing_emails = set(campaign.recipients.values_list("email", flat=True))
        existing_emails_lower = {email.lower() for email in existing_emails}

        bulk_list = []
        new_raw_datas = []

        for emp in employees:
            email_val = emp.email.strip() if emp.email else f"employee_{emp.id}@unresolved.local"
            if email_val.lower() in existing_emails_lower:
                continue

            raw_data = {
                "email": emp.email,
                "recipient_name": emp.name,
                "company_name": enrichment.company_name,
                "job_title": emp.job_title,
                "linkedin_url": emp.linkedin_url,
                "source_url": emp.linkedin_url,
            }

            bulk_list.append(
                RecipientList(
                    campaign=campaign,
                    email=email_val,
                    name=emp.name,
                    raw_data=raw_data,
                )
            )
            new_raw_datas.append(raw_data)

        if bulk_list:
            RecipientList.objects.bulk_create(bulk_list, ignore_conflicts=True)

        current_count = campaign.recipients.count()
        created_count = current_count - previous_count
        Campaign.objects.filter(pk=campaign_id).update(total_recipients=current_count)

        # Google Sheets Sync
        if campaign.google_sheet_sync_enabled and campaign.google_sheet_id and new_raw_datas:
            try:
                from apps.campaigns.services.google_sheets import GoogleSheetsService
                sheet_service = GoogleSheetsService()
                existing_rows = sheet_service.fetch_sheet_rows(
                    user=request.user,
                    spreadsheet_id=campaign.google_sheet_id,
                    column_mapping=campaign.column_mapping
                )
                existing_rows.extend(new_raw_datas)
                headers = list(campaign.column_mapping.keys()) if campaign.column_mapping else ["Email", "Name"]
                sheet_service.update_sheet_rows(
                    user=request.user,
                    spreadsheet_id=campaign.google_sheet_id,
                    headers=headers,
                    rows=existing_rows,
                    column_mapping=campaign.column_mapping
                )
            except Exception as sheet_err:
                logger.error("Failed to sync imported employees to Google Sheet: %s", sheet_err)

        return Response({
            "success": True,
            "message": f"Successfully imported {created_count} employee(s) to '{campaign.name}'.",
            "count": created_count
        })


class ScrapedContactBulkDeleteView(APIView):
    """
    POST /api/scraper/contacts/bulk-delete/
    Delete multiple scraped contacts by ID.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ids = request.data.get("ids", [])
        if not isinstance(ids, list):
            return Response(
                {"error": True, "message": "Invalid IDs format. Must be a list."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        deleted_count, _ = ScrapedContact.objects.filter(
            id__in=ids,
            job__user=request.user
        ).delete()

        return Response({
            "success": True,
            "message": f"Successfully deleted {deleted_count} contacts.",
            "deleted_count": deleted_count
        })


class ProfileResearchListCreateView(APIView):
    """
    GET  /api/scraper/profiles/ — List all profile researches for this user.
    POST /api/scraper/profiles/ — Start a new profile research task.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        researches = ProfileResearch.objects.filter(user=request.user)
        serializer = ProfileResearchSerializer(researches, many=True)
        return Response(serializer.data)

    def post(self, request):
        profile_url = request.data.get("profile_url", "").strip()
        if not profile_url:
            return Response({"profile_url": ["This field is required."]}, status=status.HTTP_400_BAD_REQUEST)

        api_key = getattr(request.user, "gemini_api_key", "")
        if not api_key:
            return Response(
                {"error": "Gemini API key is required. Please set it in Settings to research profiles."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create profile research record
        from apps.scraper.tasks import clean_linkedin_profile_url
        normalized_url, _ = clean_linkedin_profile_url(profile_url)

        research = ProfileResearch.objects.create(
            user=request.user,
            profile_url=normalized_url,
            status=ProfileResearch.Status.PENDING
        )

        # Trigger celery task
        from apps.scraper.tasks import run_profile_research
        run_profile_research.delay(research.id)

        return Response(ProfileResearchSerializer(research).data, status=status.HTTP_201_CREATED)


class ProfileResearchDetailView(APIView):
    """
    GET    /api/scraper/profiles/<id>/ — Get detailed info.
    DELETE /api/scraper/profiles/<id>/ — Delete the record.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            research = ProfileResearch.objects.get(pk=pk, user=request.user)
        except ProfileResearch.DoesNotExist:
            return Response({"error": "Profile research not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = ProfileResearchSerializer(research)
        return Response(serializer.data)

    def delete(self, request, pk):
        try:
            research = ProfileResearch.objects.get(pk=pk, user=request.user)
        except ProfileResearch.DoesNotExist:
            return Response({"error": "Profile research not found."}, status=status.HTTP_404_NOT_FOUND)

        research.delete()
        return Response({"success": True, "message": "Profile research deleted successfully."})


