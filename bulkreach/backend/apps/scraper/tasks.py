"""Scraper Celery task (Phase 2)."""
import re
import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)

# Variables injected by the system — not meaningful to extract from template
_SYSTEM_VARIABLES = frozenset({
    "company_name", "company", "sender_name", "sender_email", "first_name",
    "recipient_name", "recipient_email", "email", "name", "job_title",
    "linkedin_url", "source_url",
})


def _extract_campaign_variables(template_html: str) -> list[str]:
    """Extract custom template variables that the AI should try to fill in."""
    all_vars = re.findall(r"\{\{\s*(\w+)\s*\}\}", template_html)
    return list(set(v for v in all_vars if v not in _SYSTEM_VARIABLES))


def _matches_freshness(posted_date: str, limit: str) -> bool:
    if not limit or limit == "any":
        return True
    if not posted_date:
        return True
    
    date_lower = posted_date.lower().strip()
    
    if limit == "24h":
        return any(w in date_lower for w in ["now", "hour", "1 day", "yesterday"])
        
    if limit == "week":
        if any(w in date_lower for w in ["month", "30+", "15+", "10+", "weeks", "week ago"]):
            if "1 week" in date_lower:
                return True
            return False
        
        import re
        digits = re.findall(r'\d+', date_lower)
        if digits:
            days = int(digits[0])
            if "day" in date_lower and days > 7:
                return False
        return True
        
    if limit == "month":
        if any(w in date_lower for w in ["month", "30+"]):
            if "1 month" in date_lower:
                return True
            return False
        return True
        
    return True


def _process_contacts(contacts, job, gemini_api_key, resume_text, campaign_variables, job_matches):
    """
    Filter and build ScrapedContact instances from raw scraper output.

    Returns a list of unsaved ScrapedContact objects ready for bulk_create.
    """
    from apps.scraper.models import ScrapedContact

    bulk_contacts = []
    for idx, c in enumerate(contacts):
        is_match = True
        custom_variables = {}

        if gemini_api_key and job.campaign:
            match_data = job_matches.get(str(idx), {"is_match": True, "variables": {}})
            is_match = match_data.get("is_match", False) if job.use_ai_matching else True
            raw_vars = match_data.get("variables", {})
            # Ensure extracted variables have default text if not found
            custom_variables = {var: str(raw_vars.get(var, "")) for var in campaign_variables}
        elif job.use_ai_matching:
            # No API key — can't do AI matching, skip all contacts
            is_match = False

        if is_match:
            bulk_contacts.append(
                ScrapedContact(
                    job=job,
                    name=c.get("name", ""),
                    email=c.get("email", ""),
                    company=c.get("company", ""),
                    job_title=c.get("job_title", ""),
                    linkedin_url=c.get("linkedin_url", ""),
                    source_url=c.get("source_url", ""),
                    posted_date=c.get("posted_date") or "",
                    location=c.get("location") or "",
                    salary=c.get("salary") or "",
                    custom_variables=custom_variables,
                )
            )

    return bulk_contacts


def _run_ai_matching(gemini_api_key, resume_text, contacts, campaign_variables, job):
    """Run AI batch evaluation if conditions are met; return job_matches dict."""
    if not (gemini_api_key and job.campaign):
        return {}
    from apps.scraper.ai_matcher import evaluate_jobs_batch
    company_size_filter = getattr(job, "company_size", "any")
    return evaluate_jobs_batch(
        gemini_api_key, 
        resume_text, 
        contacts, 
        campaign_variables, 
        company_size_filter,
        gemini_model=getattr(job.user, "gemini_model", "gemini-3.5-flash") or "gemini-3.5-flash"
    )


@shared_task(
    bind=True,
    max_retries=2,
    queue="scraping",
    name="scraper.run_scrape_job",
    acks_late=True,
)
def run_scrape_job(self, scrape_job_id: int) -> dict:
    """
    Run a scraping job for a given platform with keywords + location.
    Instantiates the correct scraper class and stores results as ScrapedContact rows.
    """
    from apps.scraper.models import ScrapeJob, ScrapedContact
    from apps.scraper.scrapers.linkedin_scraper import LinkedInScraper
    from apps.scraper.scrapers.naukri_scraper import NaukriScraper
    from apps.scraper.scrapers.indeed_scraper import IndeedScraper
    from apps.scraper.scrapers.web_scraper import WebScraper
    from apps.scraper.scrapers.glassdoor_scraper import GlassdoorScraper
    from apps.scraper.scrapers.wellfound_scraper import WellfoundScraper
    from apps.scraper.scrapers.foundit_scraper import FounditScraper
    from apps.scraper.scrapers.dice_scraper import DiceScraper

    SCRAPER_MAP = {
        ScrapeJob.Platform.LINKEDIN: LinkedInScraper,
        ScrapeJob.Platform.NAUKRI: NaukriScraper,
        ScrapeJob.Platform.INDEED: IndeedScraper,
        ScrapeJob.Platform.WEB: WebScraper,
        ScrapeJob.Platform.GLASSDOOR: GlassdoorScraper,
        ScrapeJob.Platform.WELLFOUND: WellfoundScraper,
        ScrapeJob.Platform.FOUNDIT: FounditScraper,
        ScrapeJob.Platform.DICE: DiceScraper,
    }

    try:
        job = ScrapeJob.objects.get(pk=scrape_job_id)
    except ScrapeJob.DoesNotExist:
        logger.error("ScrapeJob %s not found.", scrape_job_id)
        return {"error": "ScrapeJob not found."}

    try:
        from apps.scraper.ai_matcher import generate_search_keyword

        # Auto-generate keyword from resume if not provided
        search_keywords = job.keywords
        if not search_keywords.strip() and job.use_ai_matching:
            api_key = getattr(job.user, "gemini_api_key", "")
            resume_text_for_keyword = (
                job.campaign.resume.parsed_text
                if job.campaign and job.campaign.resume
                else getattr(job.user, "resume_text", "")
            )
            if api_key and resume_text_for_keyword:
                job.status = ScrapeJob.Status.RUNNING
                job.save(update_fields=["status"])
                search_keywords = generate_search_keyword(
                    api_key, 
                    resume_text_for_keyword,
                    gemini_model=getattr(job.user, "gemini_model", "gemini-3.5-flash") or "gemini-3.5-flash"
                )
                job.keywords = search_keywords
                job.save(update_fields=["keywords"])
            else:
                raise ValueError("Keywords missing and no AI setup to auto-generate.")

        job.status = ScrapeJob.Status.RUNNING
        job.save(update_fields=["status"])

        # ── Gather context once ─────────────────────────────────────────────
        resume_text = (
            job.campaign.resume.parsed_text
            if job.campaign and job.campaign.resume
            else getattr(job.user, "resume_text", "")
        )
        gemini_api_key = getattr(job.user, "gemini_api_key", "")

        campaign_variables = []
        if job.campaign and job.campaign.template:
            campaign_variables = _extract_campaign_variables(job.campaign.template.html_body)

        # ── Primary scrape ──────────────────────────────────────────────────
        scraper_class = SCRAPER_MAP[job.platform]
        scraper = scraper_class()

        contacts = []
        direct_error = None
        try:
            contacts = scraper.scrape(
                keywords=search_keywords,
                location=job.location,
                max_results=job.max_results,
            )
        except Exception as scraper_exc:
            logger.error("Scraper %s failed: %s", job.platform, scraper_exc, exc_info=True)
            direct_error = f"{job.platform.title()} scraper failed: {str(scraper_exc)}"

        # Filter primary contacts by freshness limit
        freshness_limit = getattr(job, "freshness", "any")
        if freshness_limit and freshness_limit != "any":
            contacts = [c for c in contacts if _matches_freshness(c.get("posted_date"), freshness_limit)]

        # ── AI matching for primary results ─────────────────────────────────
        job_matches = _run_ai_matching(gemini_api_key, resume_text, contacts, campaign_variables, job)
        bulk_contacts = _process_contacts(contacts, job, gemini_api_key, resume_text, campaign_variables, job_matches)

        if bulk_contacts:
            ScrapedContact.objects.bulk_create(bulk_contacts)

        # ── Fallback: WebScraper if primary returned nothing ────────────────
        status = ScrapeJob.Status.DONE
        error_msg = ""

        if len(contacts) == 0 and job.platform != ScrapeJob.Platform.WEB:
            logger.info("Scraper for %s returned 0 results. Falling back to WebScraper.", job.platform)
            fallback_scraper = WebScraper()
            try:
                contacts = fallback_scraper.scrape(
                    keywords=search_keywords,
                    location=job.location,
                    max_results=job.max_results,
                )

                if contacts:
                    # Filter fallback contacts by freshness limit
                    if freshness_limit and freshness_limit != "any":
                        contacts = [c for c in contacts if _matches_freshness(c.get("posted_date"), freshness_limit)]
                    error_msg = (
                        f"{direct_error}. Fell back to DuckDuckGo Web Search to find matching listings."
                        if direct_error
                        else (
                            f"No direct results found on {job.platform.title()} "
                            f"(blocked by anti-bot or restrictive settings). "
                            f"Fell back to DuckDuckGo Web Search to find matching listings."
                        )
                    )

                    # Re-run AI matching on fallback contacts
                    job_matches = _run_ai_matching(
                        gemini_api_key, resume_text, contacts, campaign_variables, job
                    )
                    fallback_bulk = _process_contacts(
                        contacts, job, gemini_api_key, resume_text, campaign_variables, job_matches
                    )
                    if fallback_bulk:
                        ScrapedContact.objects.bulk_create(fallback_bulk)
                    bulk_contacts.extend(fallback_bulk)

            except Exception as fallback_exc:
                logger.error("Fallback WebScraper failed for job %s: %s", scrape_job_id, fallback_exc)

        # ── Determine final status ──────────────────────────────────────────
        if len(contacts) == 0:
            status = ScrapeJob.Status.FAILED
            error_msg = (
                f"{direct_error}. Fallback search on DuckDuckGo also returned 0 results."
                if direct_error
                else (
                    f"Zero results found on {job.platform.title()}. This is usually because the scraper "
                    f"was blocked by CAPTCHA/anti-bot protections, or the search keywords were too restrictive."
                )
            )
        elif len(bulk_contacts) == 0:
            status = ScrapeJob.Status.FAILED
            error_msg = (
                "The scraper found jobs, but the AI matching step rejected all of them "
                "as irrelevant based on your campaign criteria."
            )

        ScrapeJob.objects.filter(pk=scrape_job_id).update(
            status=status,
            result_count=len(bulk_contacts),
            error_message=error_msg,
            completed_at=timezone.now(),
        )
        return {"scraped": len(bulk_contacts)}

    except Exception as exc:
        logger.error("Scrape job %s failed: %s", scrape_job_id, exc)
        err_str = str(exc).lower()
        error_msg = str(exc)[:500]
        if "429" in err_str or "resource_exhausted" in err_str or "quota" in err_str:
            error_msg = "Gemini API quota exceeded or rate limit reached. Please wait a moment or check your Gemini API key billing settings."
        elif "503" in err_str or "unavailable" in err_str or "demand" in err_str:
            error_msg = "Gemini API is temporarily experiencing high demand (503 Service Unavailable). Please try again in a few moments."
            
        ScrapeJob.objects.filter(pk=scrape_job_id).update(
            status=ScrapeJob.Status.FAILED,
            error_message=error_msg,
            completed_at=timezone.now(),
        )
        raise self.retry(exc=exc, countdown=30)


def _perform_web_search(query: str, max_results: int = 15) -> list[dict]:
    """
    Search Yahoo first, then DuckDuckGo API (via ddgs) if Yahoo returns nothing,
    and then DuckDuckGo HTML parsing as a final fallback.
    Returns a list of dicts: [{'title': '...', 'snippet': '...', 'link': '...'}]
    """
    import urllib.parse
    import requests
    from bs4 import BeautifulSoup

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/122.0.0.0 Safari/537.36"
        )
    }

    results = []

    # 1. Try Yahoo search
    try:
        logger.info("Searching Yahoo for: %s", query)
        encoded_query = urllib.parse.quote(query)
        yahoo_url = f"https://search.yahoo.com/search?p={encoded_query}"
        resp = requests.get(yahoo_url, headers=headers, timeout=8)
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, "html.parser")
            for item in soup.select(".algo")[:max_results]:
                title_el = item.find("h3")
                link_el = item.find("a")
                snippet_el = item.select_one(".compText") or item.find("p")

                title = title_el.get_text(strip=True) if title_el else ""
                link = link_el.get("href", "") if link_el else ""
                snippet = snippet_el.get_text(strip=True) if snippet_el else ""

                if title and link:
                    results.append({"title": title, "snippet": snippet, "link": link})
    except Exception as e:
        logger.warning("Yahoo search failed: %s", e)

    # 2. Try DDG API (via ddgs) if we need more results
    if len(results) < 5:
        try:
            logger.info("Searching DuckDuckGo API for: %s", query)
            from ddgs import DDGS
            with DDGS() as ddgs:
                ddg_results = ddgs.text(query, max_results=max_results)
                if ddg_results:
                    for r in ddg_results:
                        results.append({
                            "title": r.get("title", ""),
                            "snippet": r.get("body", r.get("snippet", "")),
                            "link": r.get("href", r.get("link", ""))
                        })
        except Exception as e:
            logger.warning("DuckDuckGo API search failed: %s", e)

    # 3. Try DDG HTML parsing as fallback
    if len(results) < 5:
        try:
            logger.info("Searching DuckDuckGo HTML for: %s", query)
            encoded_query = urllib.parse.quote(query)
            ddg_url = f"https://html.duckduckgo.com/html/?q={encoded_query}"
            resp = requests.get(ddg_url, headers=headers, timeout=8)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "html.parser")
                for item in soup.select(".result__body")[:max_results]:
                    title_el = item.select_one(".result__title")
                    link_el = title_el.find("a") if title_el else None
                    snippet_el = item.select_one(".result__snippet")

                    title = title_el.get_text(strip=True) if title_el else ""
                    link = link_el.get("href", "") if link_el else ""
                    snippet = snippet_el.get_text(strip=True) if snippet_el else ""

                    if title and link:
                        results.append({"title": title, "snippet": snippet, "link": link})
        except Exception as e:
            logger.warning("DuckDuckGo HTML search failed: %s", e)

    # Deduplicate by link
    seen_links = set()
    deduped_results = []
    for r in results:
        link = r.get("link", "")
        if link and link not in seen_links:
            seen_links.add(link)
            deduped_results.append(r)

    return deduped_results[:max_results]


@shared_task(
    bind=True,
    max_retries=1,
    queue="scraping",
    name="scraper.run_company_enrichment",
)
def run_company_enrichment(self, enrichment_id: int, job_titles: list[str]) -> dict:
    from apps.scraper.models import CompanyEnrichment, CompanyEmployee
    from google import genai
    from google.genai import types
    from pydantic import BaseModel, Field
    from typing import List, Optional
    import json

    class CompanyInfoSchema(BaseModel):
        company_name: Optional[str] = Field(None, description="Name of company or null")
        domain: Optional[str] = Field(None, description="domain name or null")
        website: Optional[str] = Field(None, description="website URL or null")
        description: Optional[str] = Field(None, description="description or null")
        location: Optional[str] = Field(None, description="headquarters location or null")
        industry: Optional[str] = Field(None, description="industry or null")

    class EmployeeInfoSchema(BaseModel):
        name: str = Field(..., description="Employee Full Name")
        job_title: Optional[str] = Field(None, description="Employee Job Title")
        linkedin_url: Optional[str] = Field(None, description="LinkedIn Profile URL")
        email: Optional[str] = Field(None, description="Synthesized Email Address")

    class EmployeesListSchema(BaseModel):
        employees: List[EmployeeInfoSchema]

    try:
        enrichment = CompanyEnrichment.objects.get(pk=enrichment_id)
    except CompanyEnrichment.DoesNotExist:
        logger.error("CompanyEnrichment %s not found.", enrichment_id)
        return {"error": "CompanyEnrichment not found."}

    try:
        enrichment.status = CompanyEnrichment.Status.RUNNING
        enrichment.save(update_fields=["status"])

        user = enrichment.user
        api_key = getattr(user, "gemini_api_key", "")
        if not api_key:
            raise ValueError("Gemini API key is required. Please set it in Settings.")

        client = genai.Client(api_key=api_key)
        company_name = enrichment.company_name

        # 1. Search for company details
        logger.info("Running company details search for: %s", company_name)
        company_query = f'"{company_name}" company website location industry description'
        company_search_results = _perform_web_search(company_query, max_results=5)

        if not company_search_results:
            raise ValueError(f"Could not find any search results for company '{company_name}'.")

        # Parse company details with Gemini
        company_prompt = f"""
        Analyze the following search results for the company "{company_name}".
        Your task is to extract the following structured details:
        1. Normalized Company Name (e.g. "Stripe")
        2. Website Domain (e.g. "stripe.com" - strictly the domain name, no https:// or trailing slash)
        3. Website URL (e.g. "https://stripe.com" - the full home page URL)
        4. Brief Description/Overview of the company (1-3 sentences)
        5. Headquarters Location (city, state/country)
        6. Industry (e.g. "Financial Services", "Software Development", "Healthcare")

        Search Results:
        {json.dumps(company_search_results, indent=2)}
        """

        response = client.models.generate_content(
            model=getattr(user, "gemini_model", "gemini-3.5-flash") or "gemini-3.5-flash",
            contents=company_prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=CompanyInfoSchema,
            )
        )

        company_info = json.loads(response.text)

        domain = company_info.get("domain") or ""
        website = company_info.get("website") or ""
        description = company_info.get("description") or ""
        location = company_info.get("location") or ""
        industry = company_info.get("industry") or ""
        normalized_name = company_info.get("company_name") or company_name

        # Determine logo URL via clearbit if domain is found, else fallback
        logo_url = ""
        if domain:
            logo_url = f"https://logo.clearbit.com/{domain}"

        # Update company details in db
        enrichment.domain = domain
        enrichment.website = website
        enrichment.description = description
        enrichment.location = location
        enrichment.industry = industry
        enrichment.logo_url = logo_url
        enrichment.save()

        # 2. Search for employees using the normalized name
        titles_to_use = job_titles or ["HR", "Recruiter", "Talent Acquisition", "Engineering Manager", "Hiring Manager"]
        
        employee_search_results = []
        seen_links = set()
        
        # Query each title individually to get highly targeted results
        for title in titles_to_use:
            employee_query = f'site:linkedin.com/in/ "{normalized_name}" "{title}"'
            logger.info("Searching for employees of %s with query: %s", normalized_name, employee_query)
            results = _perform_web_search(employee_query, max_results=6)
            for r in results:
                link = r.get("link", "")
                if link and link not in seen_links:
                    seen_links.add(link)
                    employee_search_results.append(r)
            
            # Short sleep to prevent rate limits
            import time
            time.sleep(0.1)

        employees_list = []
        if employee_search_results:
            employee_prompt = f"""
            Analyze the following search results for employees at "{normalized_name}".
            Your task is to identify and extract the name, job title, and LinkedIn URL of only the employees who match the target job titles or functions.

            Company: {normalized_name}
            Company Domain: {domain or 'company.com'}
            Target Job Titles/Functions: {', '.join(titles_to_use)}

            Search Results:
            {json.dumps(employee_search_results, indent=2)}

            Instructions:
            1. Extract the full personal name of each employee. Ignore results that are not individuals (e.g. jobs, companies).
            2. CRITICAL: Strictly verify that the employee is CURRENTLY working at or associated with "{normalized_name}". The company name "{normalized_name}" (or a close variation) MUST be explicitly mentioned in the search result's title or snippet text. If "{normalized_name}" is NOT mentioned in the title/snippet, or if the person is working at another company, you MUST EXCLUDE them. Do NOT assume they work at the company just because they appeared in the search results.
            3. Extract their exact job title at "{normalized_name}".
            4. CRITICAL: Only include employees whose job title or role strictly matches or is closely related to the Target Job Titles/Functions: {', '.join(titles_to_use)}. Strictly exclude unrelated roles (e.g., developers, software engineers, sales representatives, marketing executives, designers, QA engineers, founders/owners, etc. unless they are explicitly listed in target titles).
            5. Extract their LinkedIn profile URL.
            6. Predict/synthesize their corporate email address based on their name and the company domain "{domain or 'company.com'}". Use common patterns like first.last@domain.com, ffirstlast@domain.com, or first@domain.com.
            """

            response2 = client.models.generate_content(
                model=getattr(user, "gemini_model", "gemini-3.5-flash") or "gemini-3.5-flash",
                contents=employee_prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=EmployeesListSchema,
                )
            )

            employees_data = json.loads(response2.text)
            raw_employees = employees_data.get("employees") or []

            # Create employee records
            bulk_employees = []
            for emp in raw_employees:
                name = emp.get("name")
                if not name or name.lower() == "null" or "linkedin" in name.lower():
                    continue

                bulk_employees.append(
                    CompanyEmployee(
                        company=enrichment,
                        name=name.strip(),
                        job_title=(emp.get("job_title") or "").strip(),
                        linkedin_url=(emp.get("linkedin_url") or "").strip(),
                        email=(emp.get("email") or "").strip()
                    )
                )

            if bulk_employees:
                CompanyEmployee.objects.bulk_create(bulk_employees)
                employees_list = bulk_employees

        enrichment.status = CompanyEnrichment.Status.DONE
        enrichment.completed_at = timezone.now()
        enrichment.save()

        return {
            "success": True,
            "company_name": normalized_name,
            "employees_found": len(employees_list)
        }

    except Exception as exc:
        logger.error("Company enrichment %s failed: %s", enrichment_id, exc)
        enrichment.status = CompanyEnrichment.Status.FAILED
        enrichment.error_message = str(exc)[:1000]
        enrichment.completed_at = timezone.now()
        enrichment.save()
        return {"error": str(exc)}

