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
    
    # Normalize "past_24h" -> "24h", "past_week" -> "week", "past_month" -> "month"
    limit = limit.replace("past_", "")
    
    if not posted_date:
        return True
    
    date_lower = posted_date.lower().strip()
    if any(w in date_lower for w in ["now", "today", "hour", "minute"]):
        days = 0
    elif "yesterday" in date_lower:
        days = 1
    else:
        digits = re.findall(r'\d+', date_lower)
        val = int(digits[0]) if digits else 1
        
        if "day" in date_lower:
            days = val
        elif "week" in date_lower:
            days = val * 7
        elif "month" in date_lower:
            days = val * 30
        elif "year" in date_lower:
            days = val * 365
        else:
            days = 0
            
    if limit == "24h":
        return days <= 1
    elif limit == "week":
        return days <= 7
    elif limit == "month":
        return days <= 30
        
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
    model_name = getattr(job.user, "gemini_model", "gemini-2.5-flash") or "gemini-2.5-flash"
    result = evaluate_jobs_batch(
        gemini_api_key, 
        resume_text, 
        contacts, 
        campaign_variables, 
        company_size_filter,
        gemini_model=model_name
    )
    from apps.accounts.models import log_ai_usage
    log_ai_usage(job.user, "AI Job Matching", model_name=model_name)
    return result


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
                    gemini_model=getattr(job.user, "gemini_model", "gemini-2.5-flash") or "gemini-2.5-flash"
                )
                from apps.accounts.models import log_ai_usage
                log_ai_usage(
                    job.user,
                    "AI Keyword Generation",
                    model_name=getattr(job.user, "gemini_model", "gemini-2.5-flash") or "gemini-2.5-flash"
                )
                job.keywords = search_keywords
                job.save(update_fields=["keywords"])
            else:
                raise ValueError("Keywords missing and no AI setup to auto-generate.")

        job.status = ScrapeJob.Status.RUNNING
        job.started_at = timezone.now()
        job.save(update_fields=["status", "started_at"])

        # ── Gather context once ─────────────────────────────────────────────
        resume_text = (
            job.campaign.resume.parsed_text
            if job.campaign and job.campaign.resume
            else getattr(job.user, "resume_text", "")
        )
        gemini_api_key = getattr(job.user, "gemini_api_key", "")
        if job.use_ai_matching and not gemini_api_key:
            raise ValueError("Gemini API key is missing. Please add your Gemini API key in Settings to use AI matching.")

        campaign_variables = []

        if job.campaign and job.campaign.template:
            campaign_variables = _extract_campaign_variables(job.campaign.template.html_body)

        # Get existing URLs of scraped contacts for this user to avoid re-scraping them
        from apps.scraper.models import ScrapedContact
        existing_contacts = ScrapedContact.objects.filter(job__user=job.user)
        existing_urls = {
            url.strip().lower()
            for url in existing_contacts.exclude(source_url="").values_list("source_url", flat=True)
        }
        existing_titles_companies = {
            (comp.strip().lower(), title.strip().lower())
            for comp, title in existing_contacts.values_list("company", "job_title")
            if comp and title
        }

        # ── Primary scrape ──────────────────────────────────────────────────
        scraper_class = SCRAPER_MAP[job.platform]
        scraper = scraper_class(existing_urls=existing_urls, existing_titles_companies=existing_titles_companies)

        contacts = []
        direct_error = None
        freshness_limit = getattr(job, "freshness", "any")
        try:
            contacts = scraper.scrape(
                keywords=search_keywords,
                location=job.location,
                max_results=job.max_results,
                freshness=freshness_limit,
            )
        except Exception as scraper_exc:
            logger.error("Scraper %s failed: %s", job.platform, scraper_exc, exc_info=True)
            direct_error = f"{job.platform.title()} scraper failed: {str(scraper_exc)}"

        # Filter primary contacts by freshness limit
        if freshness_limit and freshness_limit != "any":
            contacts = [c for c in contacts if _matches_freshness(c.get("posted_date"), freshness_limit)]

        filtered_contacts = []
        for c in contacts:
            url_val = c.get("source_url", "").strip().lower()
            comp_val = c.get("company", "").strip().lower()
            title_val = c.get("job_title", "").strip().lower()
            if url_val and url_val in existing_urls:
                continue
            if comp_val and title_val and (comp_val, title_val) in existing_titles_companies:
                continue
            filtered_contacts.append(c)
        contacts = filtered_contacts

        # ── AI matching for primary results ─────────────────────────────────
        job_matches = _run_ai_matching(gemini_api_key, resume_text, contacts, campaign_variables, job)
        bulk_contacts = _process_contacts(contacts, job, gemini_api_key, resume_text, campaign_variables, job_matches)

        if bulk_contacts:
            ScrapedContact.objects.bulk_create(bulk_contacts)

        # ── Fallback: WebScraper if primary returned nothing ────────────────
        status = ScrapeJob.Status.DONE
        error_msg = ""

        if len(contacts) < 3 and job.platform != ScrapeJob.Platform.WEB:
            logger.info("Scraper for %s returned only %d results. Falling back to WebScraper.", job.platform, len(contacts))
            fallback_scraper = WebScraper(existing_urls=existing_urls, existing_titles_companies=existing_titles_companies)
            try:
                fallback_results = fallback_scraper.scrape(
                    keywords=search_keywords,
                    location=job.location,
                    max_results=job.max_results,
                    freshness=freshness_limit,
                )

                if fallback_results:
                    # Filter fallback contacts by freshness limit
                    if freshness_limit and freshness_limit != "any":
                        fallback_results = [c for c in fallback_results if _matches_freshness(c.get("posted_date"), freshness_limit)]
                    
                    # Deduplicate: don't add fallback URLs that are already in contacts
                    seen_urls = {c.get("source_url", "").strip().lower() for c in contacts if c.get("source_url")}
                    
                    # Filter out already scraped contacts from fallback results
                    filtered_fallback = []
                    for r in fallback_results:
                        url_val = r.get("source_url", "").strip().lower()
                        comp_val = r.get("company", "").strip().lower()
                        title_val = r.get("job_title", "").strip().lower()
                        
                        if url_val and (url_val in existing_urls or url_val in seen_urls):
                            continue
                        if comp_val and title_val and (comp_val, title_val) in existing_titles_companies:
                            continue
                        filtered_fallback.append(r)
                    fallback_results = filtered_fallback
                    
                    if fallback_results:
                        error_msg = (
                            f"{direct_error}. Fell back to DuckDuckGo Web Search to find matching listings."
                            if direct_error
                            else (
                                f"Only {len(contacts)} direct results found on {job.platform.title()} "
                                f"(blocked by anti-bot or restrictive settings). "
                                f"Fell back to DuckDuckGo Web Search to find matching listings."
                            )
                        )

                        # Re-run AI matching on fallback contacts
                        job_matches = _run_ai_matching(
                            gemini_api_key, resume_text, fallback_results, campaign_variables, job
                        )
                        fallback_bulk = _process_contacts(
                            fallback_results, job, gemini_api_key, resume_text, campaign_variables, job_matches
                        )
                        if fallback_bulk:
                            ScrapedContact.objects.bulk_create(fallback_bulk)
                        bulk_contacts.extend(fallback_bulk)
                        contacts.extend(fallback_results)

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
        role_description: Optional[str] = Field(None, description="Detailed role description or focus areas at the company")
        profile_insights: Optional[str] = Field(None, description="Personalized outreach insights or hooks based on their profile to customize messages")

    class EmployeesListSchema(BaseModel):
        employees: List[EmployeeInfoSchema]

    try:
        enrichment = CompanyEnrichment.objects.get(pk=enrichment_id)
    except CompanyEnrichment.DoesNotExist:
        logger.error("CompanyEnrichment %s not found.", enrichment_id)
        return {"error": "CompanyEnrichment not found."}

    try:
        enrichment.status = CompanyEnrichment.Status.RUNNING
        enrichment.started_at = timezone.now()
        enrichment.save(update_fields=["status", "started_at"])

        user = enrichment.user
        api_key = getattr(user, "gemini_api_key", "")
        if not api_key:
            raise ValueError("Gemini API key is required. Please set it in Settings.")

        client = genai.Client(api_key=api_key)
        company_name = enrichment.company_name
        linkedin_handle = None

        # Parse company name if a URL is provided
        import urllib.parse
        company_query_name = company_name
        company_name_lower = company_name.lower().strip()
        
        if (
            company_name_lower.startswith("http://") 
            or company_name_lower.startswith("https://") 
            or "linkedin.com/company/" in company_name_lower
        ):
            url_clean = company_name.strip(" /")
            if "linkedin.com/company/" in company_name_lower:
                parts = company_name_lower.split("linkedin.com/company/")
                if len(parts) > 1:
                    handle = parts[1].split("/")[0].split("?")[0].strip()
                    linkedin_handle = handle
                    company_query_name = handle.replace("-", " ").replace("_", " ").title()
            else:
                try:
                    parsed_url = urllib.parse.urlparse(url_clean)
                    domain_name = parsed_url.netloc.replace("www.", "")
                    company_query_name = domain_name.split(".")[0].title()
                except Exception:
                    pass

        # 1. Search for company details
        logger.info("Running company details search for: %s (query name: %s)", company_name, company_query_name)
        company_query = f'"{company_query_name}" company website location industry description'
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
            model=getattr(user, "gemini_model", "gemini-2.5-flash") or "gemini-2.5-flash",
            contents=company_prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=CompanyInfoSchema,
            )
        )

        from apps.accounts.models import log_ai_usage
        log_ai_usage(
            user,
            "AI Company Details Enrichment",
            model_name=getattr(user, "gemini_model", "gemini-2.5-flash") or "gemini-2.5-flash"
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

        # 2. Search for employees using the brand name (cleaned of corporate suffixes)
        import re
        def clean_company_brand_name(name_str: str) -> str:
            suffixes = [
                r'\bprivate\s+limited\b', r'\bpvt\s+ltd\b', r'\bprivate\s+ltd\b', r'\bprivate\b', r'\blimited\b',
                r'\bltd\b', r'\binc\b', r'\bincorporated\b', r'\bllc\b', r'\bcorp\b',
                r'\bcorporation\b', r'\bco\b', r'\bgroup\b'
            ]
            cleaned = name_str
            cleaned = " ".join(cleaned.split())
            for suffix in suffixes:
                cleaned = re.compile(suffix, re.IGNORECASE).sub('', cleaned)
            cleaned = cleaned.replace('"', '').replace("'", "").strip(' .,-')
            cleaned = " ".join(cleaned.split())
            return cleaned if cleaned else name_str

        search_brand_name = clean_company_brand_name(normalized_name)
        titles_to_use = job_titles or ["HR", "Recruiter", "Talent Acquisition", "Engineering Manager", "Hiring Manager"]
        
        employee_search_results = []
        seen_links = set()
        
        # Query each title individually to get highly targeted results
        for title in titles_to_use:
            queries = [f'site:linkedin.com/in/ "{search_brand_name}" "{title}"']
            if linkedin_handle:
                queries.append(f'site:linkedin.com/in/ "{linkedin_handle}" "{title}"')
            
            for employee_query in queries:
                logger.info("Searching for employees of %s with query: %s", search_brand_name, employee_query)
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
            Analyze the following search results for employees at "{search_brand_name}".
            Your task is to identify and extract the name, job title, and LinkedIn URL of only the employees who match the target job titles or functions, and generate outreach insights.

            Company Brand Name: {search_brand_name}
            Full Legal Name (for reference): {normalized_name}
            Company Domain: {domain or 'company.com'}
            Target Job Titles/Functions: {', '.join(titles_to_use)}

            Search Results:
            {json.dumps(employee_search_results, indent=2)}

            Instructions:
            1. Extract the full personal name of each employee. Ignore results that are not individuals (e.g. jobs, companies).
            2. CRITICAL: Strictly verify that the employee is CURRENTLY working at or associated with the target company. The company name "{search_brand_name}" (or a close variation / brand name like "{search_brand_name}") MUST be explicitly mentioned in the search result's title or snippet text. Ignore legal/corporate suffixes like 'Private Limited', 'Pvt Ltd', 'LLC', 'Inc', 'Ltd', 'Co' during matching. If the person is working at another company, you MUST EXCLUDE them. Do NOT assume they work at the company just because they appeared in the search results.
            3. Extract their exact job title at "{search_brand_name}".
            4. CRITICAL: Only include employees whose job title or role strictly matches or is closely related to the Target Job Titles/Functions: {', '.join(titles_to_use)}. Strictly exclude unrelated roles (e.g., developers, software engineers, sales representatives, marketing executives, designers, QA engineers, founders/owners, etc. unless they are explicitly listed in target titles).
            5. Extract their LinkedIn profile URL.
            6. Predict/synthesize their corporate email address based on their name and the company domain "{domain or 'company.com'}". Use common patterns like first.last@domain.com, ffirstlast@domain.com, or first@domain.com.
            7. Based on the snippet text and title, extract or infer a brief role description or focus areas (e.g., 'Manages technical recruiting and talent operations', or 'Oversees global human resources and hiring policies').
            8. Based on their title and role, generate 1-2 brief, actionable outreach insights or hooks (e.g., 'Emphasize engineering matching efficiency and speed when reaching out to this technical recruiter', or 'Focus on senior-level executive placement stats since they manage leadership recruiting').
            """

            response2 = client.models.generate_content(
                model=getattr(user, "gemini_model", "gemini-2.5-flash") or "gemini-2.5-flash",
                contents=employee_prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=EmployeesListSchema,
                )
            )

            from apps.accounts.models import log_ai_usage
            log_ai_usage(
                user,
                "AI Employee Insights Enrichment",
                model_name=getattr(user, "gemini_model", "gemini-2.5-flash") or "gemini-2.5-flash"
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
                        name=clean_llm_string(name),
                        job_title=clean_llm_string(emp.get("job_title") or ""),
                        linkedin_url=(emp.get("linkedin_url") or "").strip(),
                        email=clean_llm_string(emp.get("email") or ""),
                        role_description=clean_llm_string(emp.get("role_description") or ""),
                        profile_insights=clean_llm_string(emp.get("profile_insights") or "")
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
        err_str = str(exc).lower()
        error_msg = str(exc)[:1000]
        if "429" in err_str or "resource_exhausted" in err_str or "quota" in err_str:
            error_msg = "Gemini API quota exceeded or rate limit reached. If you are using the free tier, consider switching to gemini-2.5-flash in Settings or enabling billing on Google AI Studio."
        elif "503" in err_str or "unavailable" in err_str or "demand" in err_str:
            error_msg = "Gemini API is temporarily experiencing high demand (503 Service Unavailable). Please try again in a few moments."
        
        enrichment.status = CompanyEnrichment.Status.FAILED
        enrichment.error_message = error_msg
        enrichment.completed_at = timezone.now()
        enrichment.save()
        return {"error": error_msg}


def clean_llm_string(text: str) -> str:
    """
    Cleans up common formatting issues from LLM responses, 
    such as literal "\n" strings instead of actual newlines, and escaped characters.
    """
    if not text:
        return ""
    # Replace literal "\n" string representation with actual newline character
    text = text.replace("\\n", "\n")
    # Replace LaTeX-style escaped characters that LLM often returns in JSON mode
    text = text.replace("\\&", "&")
    text = text.replace("\\_", "_")
    text = text.replace('\\"', '"')
    text = text.replace("\\'", "'")
    return text.strip()


def clean_linkedin_profile_url(profile_url: str) -> tuple[str, str]:
    """
    Normalizes a LinkedIn profile URL or handle.
    Returns: (normalized_url, slug)
    e.g. 'https://in.linkedin.com/in/john-doe-123/?abc=123' -> ('https://www.linkedin.com/in/john-doe-123', 'john-doe-123')
    """
    import re
    url = profile_url.strip()
    
    # Check if it has linkedin.com/in/ in it
    match = re.search(r'linkedin\.com/in/([^/?#]+)', url, re.IGNORECASE)
    if match:
        slug = match.group(1)
        return f"https://www.linkedin.com/in/{slug}", slug
        
    # Check if it's already just the slug (no slashes, no dots)
    if '/' not in url and '.' not in url:
        return f"https://www.linkedin.com/in/{url}", url
        
    # Fallback to general splits
    # Remove query params first
    clean_url = url.split('?')[0].split('#')[0].rstrip('/')
    slug = clean_url.split('/')[-1]
    return f"https://www.linkedin.com/in/{slug}", slug


@shared_task(
    bind=True,
    max_retries=2,
    queue="scraping",
    name="scraper.run_profile_research",
)
def run_profile_research(self, profile_research_id: int) -> dict:
    from apps.scraper.models import ProfileResearch
    from google import genai
    from google.genai import types
    from pydantic import BaseModel, Field
    from typing import List, Optional
    import json

    class ProfileDetailsSchema(BaseModel):
        found_data: bool = Field(..., description="Set to true if matching web search snippets exist for this specific person. Set to false if snippets are empty, generic, or do not contain information about the target person.")
        name: Optional[str] = Field(default=None, description="Full Name of the person")
        job_title: Optional[str] = Field(default=None, description="Job title / role")
        company: Optional[str] = Field(default=None, description="Current company name")
        headline: Optional[str] = Field(default=None, description="Profile headline / professional tagline")
        total_experience: Optional[str] = Field(default=None, description="Total years of work experience, e.g. '5 years', '10+ years'")
        email: Optional[str] = Field(default=None, description="Guessed or estimated professional email format (e.g. first.last@company.com or careers@company.com)")
        phone_number: Optional[str] = Field(default=None, description="Phone number if publicly available, or null")
        location: Optional[str] = Field(default=None, description="Location/City/Country")
        summary: Optional[str] = Field(default=None, description="Short professional summary of their background")
        skills: List[str] = Field(default=[], description="Key skills list")
        interests: List[str] = Field(default=[], description="Subjects, projects, technologies, or topics this person is likely interested in based on their profile")
        connection_message: Optional[str] = Field(default=None, description="LinkedIn connection request message, strictly under 300 characters, personalized to their focus and friendly.")
        outreach_message: Optional[str] = Field(default=None, description="Personalized outreach message (email body) based on their professional background, mentioning specific things they are interested in.")

    try:
        research = ProfileResearch.objects.get(pk=profile_research_id)
    except ProfileResearch.DoesNotExist:
        logger.error("ProfileResearch %s not found.", profile_research_id)
        return {"error": "ProfileResearch not found."}

    try:
        research.status = ProfileResearch.Status.RUNNING
        research.started_at = timezone.now()
        research.save(update_fields=["status", "started_at"])

        user = research.user
        api_key = getattr(user, "gemini_api_key", "")
        if not api_key:
            raise ValueError("Gemini API key is required. Please set it in Settings.")

        client = genai.Client(api_key=api_key)
        profile_url = research.profile_url
        normalized_url, slug = clean_linkedin_profile_url(profile_url)

        # Update to clean URL in DB if it was not already cleaned
        if research.profile_url != normalized_url:
            research.profile_url = normalized_url
            research.save(update_fields=["profile_url"])

        logger.info("Searching search engine for public profile info for: %s", slug)
        search_query = f'"{normalized_url}" OR "linkedin.com/in/{slug}" OR "site:linkedin.com/in/{slug}"'
        search_results = _perform_web_search(search_query, max_results=5)
        
        import urllib.parse
        matching_results = []
        slug_lower = slug.lower()
        slug_spaced = slug_lower.replace('-', ' ')

        def filter_matches(results):
            matches = []
            for r in results:
                link = urllib.parse.unquote(r.get("link", "")).lower()
                snippet = r.get("snippet", "").lower()
                title = r.get("title", "").lower()
                
                # Match if the result is their direct LinkedIn profile page
                if f"linkedin.com/in/{slug_lower}" in link or f"linkedin.com/in/{slug_lower}/" in link:
                    matches.append(r)
                # Match if the handle itself is explicitly mentioned in title/snippet (e.g. resumes, GitHub, personal site)
                elif slug_lower in title or slug_lower in snippet:
                    matches.append(r)
                # Match if the slug with spaces is explicitly mentioned in title/snippet (handles name representations)
                elif slug_spaced in title or slug_spaced in snippet:
                    matches.append(r)
            return matches

        # Initial filtering
        matching_results = filter_matches(search_results)
        
        # Fallback 1: Try searching for the raw slug/handle (helps find GitHub, portfolio, resumes, etc.)
        if not matching_results:
            logger.info("No matching results found for URL query. Trying fallback search with raw handle: %s", slug)
            fallback_results = _perform_web_search(slug, max_results=5)
            matching_results = filter_matches(fallback_results)
            
        # Fallback 2: Try name keywords + 'linkedin' to find the profile
        if not matching_results:
            import re
            name_query = " ".join([p for p in slug.split('-') if p and not re.match(r'^[0-9a-fA-F]+$', p)])
            if name_query:
                logger.info("No matching results found for handle query. Trying fallback search with name query: %s", name_query)
                fallback_results2 = _perform_web_search(f'"{name_query}" linkedin', max_results=5)
                matching_results = filter_matches(fallback_results2)

        search_text = ""
        if matching_results:
            search_text = "\n".join([f"Title: {r.get('title')}\nSnippet: {r.get('snippet')}" for r in matching_results])

        # Candidate resume context (Sender's Resume)
        resume_text = getattr(user, "resume_text", "")

        prompt = f"""
You are an expert AI recruiter and personal profiler.
I will give you a target person's public LinkedIn profile URL, public web search snippets gathered about this target person, and the sender's (your) resume.

Target Profile URL: {normalized_url}
Target Person's Search Snippets:
{search_text}

Sender's Resume (Your Resume):
{resume_text}

Task:
1. Verify if the search snippets actually describe the Target Person at "{normalized_url}" (matching handle "{slug}").
2. If the search snippets are empty, do not contain references to the handle "{slug}", or do not contain enough public info to build a profile, you MUST set "found_data" to false in the JSON. DO NOT hallucinate fake details, companies, or names.
3. If and only if matching snippets describe the Target Person:
   - Set "found_data" to true.
   - Extract the Target Person's Name, Job Title, Current Company, Headline/tagline, Total years of work experience, Location, Summary, and Skills from the Target Person's Search Snippets.
   - CRITICAL: Do NOT extract details (such as Name, Company, or Job Title) from the Sender's Resume as the Target Person's details. The Sender's Resume belongs to the person who is reaching out, not the target person being researched.
   - Guess/synthesize a professional email address for the Target Person using their current company domain.
   - Generate a highly personalized LinkedIn Connection Message (strictly under 300 characters) and email hook from the Sender to the Target Person. Highlight how the Sender's background (from the Sender's Resume) aligns with the Target Person's role/company (from the Search Snippets).
   - CRITICAL: Write the Connection Message and Email Hook with real line breaks/newlines. Do NOT write literal '\\n' characters. Do NOT escape special characters (e.g., do NOT write '\\&', '\\_', or similar LaTeX/Markdown escapes; just write normal text like '&' or '_').

Respond ONLY with a valid JSON representation matching the requested schema.
"""
        model_name = getattr(user, "gemini_model", "gemini-2.5-flash") or "gemini-2.5-flash"
        
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ProfileDetailsSchema,
            )
        )

        from apps.accounts.models import log_ai_usage
        log_ai_usage(user, "AI Profile Research", model_name=model_name)

        data = json.loads(response.text)

        if not data.get("found_data"):
            raise ValueError(f"Could not find public profile details for the exact handle '{slug}' on the web. Please verify that the profile is public and indexed.")

        research.name = clean_llm_string(data.get("name") or "").strip() or slug.replace('-', ' ').title()
        research.job_title = clean_llm_string(data.get("job_title") or "")
        research.company = clean_llm_string(data.get("company") or "")
        research.headline = clean_llm_string(data.get("headline") or "")
        research.total_experience = clean_llm_string(data.get("total_experience") or "")
        research.email = clean_llm_string(data.get("email") or "")
        research.phone_number = clean_llm_string(data.get("phone_number") or "")
        research.location = clean_llm_string(data.get("location") or "")
        research.summary = clean_llm_string(data.get("summary") or "")
        research.skills = data.get("skills") or []
        research.interests = data.get("interests") or []
        
        conn_msg = clean_llm_string(data.get("connection_message") or "")
        # Guarantee connection message is under 300 characters
        if len(conn_msg) > 295:
            conn_msg = conn_msg[:290] + "..."
        research.connection_message = conn_msg.strip()
        research.outreach_message = clean_llm_string(data.get("outreach_message") or "")

        research.status = ProfileResearch.Status.DONE
        research.completed_at = timezone.now()
        research.save()

        return {"success": True, "name": research.name}

    except Exception as exc:
        logger.error("Profile research %s failed: %s", profile_research_id, exc)
        err_str = str(exc).lower()
        error_msg = str(exc)[:1000]
        if "429" in err_str or "resource_exhausted" in err_str or "quota" in err_str:
            error_msg = "Gemini API quota exceeded or rate limit reached. If you are using the free tier, consider switching to gemini-2.5-flash in Settings or enabling billing on Google AI Studio."
        elif "503" in err_str or "unavailable" in err_str or "demand" in err_str:
            error_msg = "Gemini API is temporarily experiencing high demand (503 Service Unavailable). Please try again in a few moments."
        
        research.status = ProfileResearch.Status.FAILED
        research.error_message = error_msg
        research.completed_at = timezone.now()
        research.save()
        return {"error": error_msg}



