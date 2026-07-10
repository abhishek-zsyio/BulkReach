"""
LinkedIn scraper (Phase 2) — uses Playwright for JS-rendered pages.

Targets LinkedIn's public jobs search (no login required).
NOTE: LinkedIn's ToS restricts automated scraping.
Use only for personal / research purposes or via LinkedIn's official API.
"""
import logging
import random
import time
from typing import List, Dict
from .base_scraper import BaseScraper

logger = logging.getLogger(__name__)

# CSS selectors for LinkedIn public job search (as of 2024/2025)
_CARD_SELECTORS = [
    ".job-search-card",       # legacy
    ".base-card",             # current public listing card
    "li.jobs-search-results__list-item",
]
_TITLE_SELECTORS = [
    ".job-search-card__title",
    ".base-search-card__title",
    "h3.base-search-card__title",
]
_COMPANY_SELECTORS = [
    ".job-search-card__company-name",
    ".base-search-card__subtitle",
    "h4.base-search-card__subtitle a",
]
_LINK_SELECTORS = [
    "a.job-search-card__title-link",
    "a.base-card__full-link",
    "a[data-tracking-control-name='public_jobs_jserp-result_search-card']",
]
_DATE_SELECTORS = [
    "time.job-search-card__listdate",
    "time.job-search-card__listdate--new",
    "time",
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


class LinkedInScraper(BaseScraper):
    """
    Scrapes LinkedIn public job listings using Playwright (headless Chromium).
    Extracts: job_title, company, source_url (LinkedIn job page).
    Note: email and name are not available on public job listings.
    """

    BASE_URL = "https://www.linkedin.com/jobs/search/"
    MIN_DELAY = 1.0  # seconds between page actions
    MAX_DELAY = 2.5

    def scrape(self, keywords: str, location: str, max_results: int = 50) -> List[Dict]:
        """Scrape LinkedIn job listings and return structured contact data."""
        try:
            from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
        except ImportError:
            logger.error(
                "Playwright not installed. Run: pip install playwright && playwright install chromium"
            )
            return []

        import urllib.parse
        encoded_kw = urllib.parse.quote(keywords)
        encoded_loc = urllib.parse.quote(location)
        results: List[Dict] = []

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

                try:
                    # Page through results (25 results per page)
                    page_num = 0
                    while len(results) < max_results:
                        start = page_num * 25
                        url = (
                            f"{self.BASE_URL}?keywords={encoded_kw}"
                            f"&location={encoded_loc}&start={start}"
                        )
                        page.goto(url, timeout=30_000, wait_until="domcontentloaded")
                        time.sleep(random.uniform(self.MIN_DELAY, self.MAX_DELAY))

                        # Try each card selector
                        job_cards = []
                        for sel in _CARD_SELECTORS:
                            try:
                                page.wait_for_selector(sel, timeout=8_000)
                                job_cards = page.query_selector_all(sel)
                                if job_cards:
                                    break
                            except PlaywrightTimeout:
                                continue

                        if not job_cards:
                            logger.warning("LinkedIn: no job cards found on page %d, stopping.", page_num)
                            break

                        for card in job_cards:
                            if len(results) >= max_results:
                                break
                            try:
                                title = _try_selector(card, _TITLE_SELECTORS)
                                company = _try_selector(card, _COMPANY_SELECTORS)
                                link = _try_selector(card, _LINK_SELECTORS, attr="href")
                                posted_date = _try_selector(card, _DATE_SELECTORS)

                                # Clean link — keep only base URL without tracking params
                                if link and "?" in link:
                                    link = link.split("?")[0]

                                if not title or not company:
                                    continue

                                name, email = self._extract_contact_info(link, company)
                                results.append(self._normalize_result({
                                    "name": name,
                                    "email": email,
                                    "job_title": title,
                                    "company": company,
                                    "source_url": link,
                                    "linkedin_url": link,
                                    "posted_date": posted_date,
                                }))
                            except Exception as ex:
                                logger.debug("LinkedIn card parse error: %s", ex)
                                continue

                        # No more pages if we got fewer cards than expected
                        if len(job_cards) < 20:
                            break
                        page_num += 1

                except Exception as exc:
                    logger.error("LinkedIn scraper page loop failed: %s", exc)
                finally:
                    context.close()
                    browser.close()
        except Exception as exc:
            logger.error("LinkedIn scraper browser context failed: %s", exc)

        logger.info("LinkedIn scraper returned %d results.", len(results))
        return results[:max_results]

