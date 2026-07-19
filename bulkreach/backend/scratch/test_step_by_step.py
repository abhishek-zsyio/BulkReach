import os
import sys
import django
import logging

sys.path.append(os.path.abspath("bulkreach/backend"))
os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings.development"
django.setup()

from apps.scraper.models import ScrapeJob, ScrapedContact
from django.utils import timezone
from apps.scraper.tasks import _extract_campaign_variables

job = ScrapeJob.objects.get(pk=44)
search_keywords = job.keywords
resume_text = job.campaign.resume.parsed_text if job.campaign and job.campaign.resume else getattr(job.user, "resume_text", "")
gemini_api_key = getattr(job.user, "gemini_api_key", "")
campaign_variables = []
if job.campaign and job.campaign.template:
    campaign_variables = _extract_campaign_variables(job.campaign.template.html_body)

from apps.scraper.models import ScrapedContact
existing_contacts = ScrapedContact.objects.filter(job__user=job.user)
existing_urls = {url.strip().lower() for url in existing_contacts.exclude(source_url="").values_list("source_url", flat=True)}
existing_titles_companies = {
    (comp.strip().lower(), title.strip().lower())
    for comp, title in existing_contacts.values_list("company", "job_title")
    if comp and title
}

print("1. Instantiating scraper class...")
from apps.scraper.scrapers.linkedin_scraper import LinkedInScraper
scraper = LinkedInScraper(existing_urls=existing_urls, existing_titles_companies=existing_titles_companies)

print("2. Running primary scraper...")
contacts = scraper.scrape(
    keywords=search_keywords,
    location=job.location,
    max_results=job.max_results,
    freshness=job.freshness,
)
print(f"Primary scraper returned {len(contacts)} results.")

print("3. Filtering primary contacts...")
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
print(f"After deduplication: {len(contacts)} contacts.")

print("4. Running AI matching for primary results...")
from apps.scraper.tasks import _run_ai_matching, _process_contacts
print(f"Calling AI matching with {len(contacts)} contacts...")
job_matches = _run_ai_matching(gemini_api_key, resume_text, contacts, campaign_variables, job)
print(f"AI matching completed. Job matches: {job_matches}")

print("5. Processing contacts...")
bulk_contacts = _process_contacts(contacts, job, gemini_api_key, resume_text, campaign_variables, job_matches)
print(f"Processed {len(bulk_contacts)} contacts.")
