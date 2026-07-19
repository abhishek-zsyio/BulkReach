"""
Naukri scraper (Phase 2) — uses Playwright for JS-rendered pages.

Targets Naukri.com's job search results. Paginates through pages until
max_results is reached.
"""
import logging
import time
import random
from typing import List, Dict
from .base_scraper import BaseScraper

logger = logging.getLogger(__name__)

# Naukri DOM selectors (current as of 2025)
# Naukri now renders primarily with React, so Playwright is needed.
CARD_SELECTORS = [
    "article.jobTuple",         # older layout
    "div.srp-jobtuple-wrapper", # newer layout
]
TITLE_SELECTORS = [
    "a.title",
    "a.job-title",
    "a[class*='title']",
]
COMPANY_SELECTORS = [
    "a.subTitle",
    "a.comp-name",
    "a[class*='comp-name']",
    "span.comp-name",
]
DATE_SELECTORS = [
    "span.day-ago",
    "span.posted-day",
    "span.job-posted-time",
]
LOCATION_SELECTORS = [
    "span.locWdth",
    "span.location",
    "span[class*='location']",
    "span[class*='loc']",
    "li.loc",
]
SALARY_SELECTORS = [
    "span.sal",
    "span.salary",
    "span[class*='salary']",
    "span[class*='sal']",
    "li.salary",
]

def _try_selector(element, selectors: list, attr: str = None) -> str:
    """Try multiple CSS selectors and return the first match."""
    for sel in selectors:
        try:
            el = element.query_selector(sel)
            if el:
                if attr:
                    val = el.get_attribute(attr)
                else:
                    val = el.inner_text()
                if val:
                    return val.strip()
        except Exception:
            continue
    return ""


class NaukriScraper(BaseScraper):
    """
    Scrapes Naukri.com job listings using Playwright.
    Supports pagination to reach max_results.
    Extracts: job_title, company, source_url.
    """

    BASE_URL = "https://www.naukri.com/{keywords}-jobs{loc_part}-{page}"
    SEARCH_URL = "https://www.naukri.com/{keywords}-jobs{loc_part}"
    MIN_DELAY = 1.0
    MAX_DELAY = 2.5

    def _build_url(self, keywords: str, location: str, page: int = 1) -> str:
        slug_kw = keywords.lower().strip().replace(" ", "-")
        loc_part = f"-in-{location.lower().strip().replace(' ', '-')}" if location.strip() else ""
        if page <= 1:
            return f"https://www.naukri.com/{slug_kw}-jobs{loc_part}"
        return f"https://www.naukri.com/{slug_kw}-jobs{loc_part}-{page}"

    def scrape(self, keywords: str, location: str, max_results: int = 50, **kwargs) -> List[Dict]:
        """Scrape Naukri job listings and return structured contact data."""
        try:
            from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
        except ImportError:
            logger.error("Playwright not installed.")
            return []

        results: List[Dict] = []
        seen_urls = set()
        seen_titles_companies = set()

        page_num = 1

        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(
                    headless=True,
                    args=[
                        "--no-sandbox", 
                        "--disable-setuid-sandbox", 
                        "--disable-dev-shm-usage",
                        "--disable-blink-features=AutomationControlled"
                    ],
                )
                context = browser.new_context(
                    user_agent=(
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/122.0.0.0 Safari/537.36"
                    ),
                    viewport={"width": 1280, "height": 900},
                )
                page = context.new_page()
                page.add_init_script("delete navigator.__proto__.webdriver;")
                page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

                while len(results) < max_results:
                    url = self._build_url(keywords, location, page_num)
                    try:
                        page.goto(url, timeout=30_000, wait_until="domcontentloaded")
                        time.sleep(random.uniform(self.MIN_DELAY, self.MAX_DELAY))

                        # Wait for job cards to load
                        job_cards = []
                        for sel in CARD_SELECTORS:
                            try:
                                page.wait_for_selector(sel, timeout=8_000)
                                job_cards = page.query_selector_all(sel)
                                if job_cards:
                                    break
                            except PlaywrightTimeout:
                                continue

                        if not job_cards:
                            logger.info("Naukri: no results on page %d, stopping.", page_num)
                            break

                        for card in job_cards:
                            if len(results) >= max_results:
                                break
                            try:
                                title = _try_selector(card, TITLE_SELECTORS)
                                company = _try_selector(card, COMPANY_SELECTORS)
                                link = _try_selector(card, TITLE_SELECTORS, attr="href")
                                posted_date = _try_selector(card, DATE_SELECTORS)
                                location_val = _try_selector(card, LOCATION_SELECTORS)
                                salary_val = _try_selector(card, SALARY_SELECTORS)

                                if not link:
                                    link = url

                                if not title or not company:
                                    continue

                                # Skip already scraped listings
                                url_clean = link.strip().lower() if link else ""
                                comp_val = company.strip().lower()
                                title_val = title.strip().lower()
                                
                                if url_clean and (url_clean in getattr(self, "existing_urls", set()) or url_clean in seen_urls):
                                    continue
                                if comp_val and title_val and ((comp_val, title_val) in getattr(self, "existing_titles_companies", set()) or (comp_val, title_val) in seen_titles_companies):
                                    continue

                                results.append({
                                    "job_title": title,
                                    "company": company,
                                    "source_url": link,
                                    "posted_date": posted_date,
                                    "location": location_val,
                                    "salary": salary_val,
                                })
                                if url_clean:
                                    seen_urls.add(url_clean)
                                if comp_val and title_val:
                                    seen_titles_companies.add((comp_val, title_val))
                            except Exception as ex:
                                logger.debug("Naukri card parse error: %s", ex)
                                continue

                        if len(job_cards) < 5:
                            break

                        page_num += 1

                    except Exception as exc:
                        logger.error("Naukri scrape request failed on page %d: %s", page_num, exc)
                        break
        except Exception as exc:
            logger.error("Naukri scraper browser context failed: %s", exc)

        logger.info("Naukri scraper returned %d raw results.", len(results))
        return self._resolve_contacts_concurrently(results[:max_results])
