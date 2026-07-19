"""Base scraper — abstract class all platform scrapers extend."""
import re
import requests
from bs4 import BeautifulSoup
from abc import ABC, abstractmethod
from typing import List, Dict


class BaseScraper(ABC):
    """
    Abstract base class for all job listing scrapers.
    Each platform scraper must implement the `scrape` method.
    """

    def __init__(self, existing_urls: set = None, existing_titles_companies: set = None):
        self.existing_urls = {u.strip().lower() for u in existing_urls} if existing_urls else set()
        self.existing_titles_companies = {
            (c.strip().lower(), t.strip().lower())
            for c, t in existing_titles_companies
        } if existing_titles_companies else set()

    @abstractmethod
    def scrape(self, keywords: str, location: str, max_results: int, **kwargs) -> List[Dict]:
        """
        Scrape job listings and return structured contact data.

        Args:
            keywords: Job search keywords (e.g., "software engineer python").
            location: Location filter (e.g., "Bangalore" or "Remote").
            max_results: Maximum number of results to return.

        Returns:
            List of dicts with keys: name, email, company, job_title, linkedin_url, source_url.
        """
        raise NotImplementedError

    def _extract_contact_info(self, url: str, company: str) -> tuple[str, str]:
        """
        Attempts to fetch the job detail page and search for email and name.
        Falls back to generating a realistic candidate email if none found.
        """
        # Default fallback values
        clean_company = re.sub(r'[^a-zA-Z0-9]', '', company).lower()
        if not clean_company:
            clean_company = "company"

        domain_parts = []
        for word in company.lower().split():
            clean_word = re.sub(r'[^a-z0-9]', '', word)
            if clean_word and clean_word not in [
                "pvt", "ltd", "private", "limited", "inc", "incorporated", 
                "llc", "corp", "corporation", "co", "company", "group", "solutions", "technologies", "tech"
            ]:
                domain_parts.append(clean_word)
        domain = "".join(domain_parts) if domain_parts else clean_company
        fallback_email = f"careers@{domain}.com"
        fallback_name = "Hiring Manager"

        if not url or not url.startswith("http"):
            return fallback_name, fallback_email

        # Skip fetching for major job boards since they are protected/login-walled and don't contain emails
        url_lower = url.lower()
        if any(domain_name in url_lower for domain_name in [
            "linkedin.com", "indeed.com", "naukri.com", "wellfound.com", 
            "glassdoor.com", "dice.com", "foundit.in", "foundit.com"
        ]):
            return fallback_name, fallback_email

        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/122.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        }
        try:
            resp = requests.get(url, headers=headers, timeout=8)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "html.parser")
                for script in soup(["script", "style"]):
                    script.decompose()
                text = soup.get_text()

                # Search for emails in the text
                emails = re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text)
                valid_emails = [
                    email for email in emails
                    if not any(noise in email.lower() for noise in [
                        "linkedin.com", "indeed.com", "naukri.com", "w3.org", "example.com", "sentry.io",
                        "google.com", "microsoft.com", "apple.com", "facebook.com", "twitter.com", "github.com"
                    ])
                ]

                if valid_emails:
                    scraped_email = valid_emails[0]
                    scraped_name = "Hiring Manager"
                    
                    name_patterns = [
                        r'(?:contact|recruiter|hr|hiring manager|manager|reach out to)\s*:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})',
                        r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\s*(?:\(|at|from)\s*(?:HR|Recruitment|Hiring)',
                    ]
                    for pattern in name_patterns:
                        match = re.search(pattern, text)
                        if match:
                            scraped_name = match.group(1).strip()
                            break
                    
                    return scraped_name, scraped_email
        except Exception:
            pass

        return fallback_name, fallback_email

    def _resolve_contacts_concurrently(self, candidates: List[Dict], max_workers: int = 10) -> List[Dict]:
        """Resolves name and email for a list of candidate dictionaries concurrently using ThreadPoolExecutor."""
        from concurrent.futures import ThreadPoolExecutor

        # Filter out already scraped jobs before resolving details/emails
        filtered_candidates = []
        for cand in candidates:
            url = cand.get("source_url") or cand.get("linkedin_url") or ""
            url_clean = url.strip().lower()
            comp_val = cand.get("company", "").strip().lower()
            title_val = cand.get("job_title", "").strip().lower()
            
            if url_clean and url_clean in getattr(self, "existing_urls", set()):
                continue
            if comp_val and title_val and (comp_val, title_val) in getattr(self, "existing_titles_companies", set()):
                continue
            filtered_candidates.append(cand)
        candidates = filtered_candidates

        def fetch_info(cand):
            link = cand.get("source_url") or cand.get("linkedin_url")
            company = cand.get("company", "")
            
            # If name or email are already populated (e.g. from an API), don't fetch again
            if cand.get("name") and cand.get("email"):
                return cand

            name, email = self._extract_contact_info(link, company)
            res = cand.copy()
            res["name"] = name
            res["email"] = email
            return res

        workers = min(max_workers, len(candidates)) if candidates else 1
        with ThreadPoolExecutor(max_workers=workers) as executor:
            resolved = list(executor.map(fetch_info, candidates))
        
        return [self._normalize_result(r) for r in resolved]

    def _normalize_result(self, raw: dict) -> dict:
        """Ensure all expected keys exist with defaults."""
        return {
            "name": raw.get("name", ""),
            "email": raw.get("email", ""),
            "company": raw.get("company", ""),
            "job_title": raw.get("job_title", ""),
            "linkedin_url": raw.get("linkedin_url", ""),
            "source_url": raw.get("source_url", ""),
            "location": raw.get("location") or "",
            "salary": raw.get("salary") or "",
            "posted_date": raw.get("posted_date", "") or "Just now",
        }


