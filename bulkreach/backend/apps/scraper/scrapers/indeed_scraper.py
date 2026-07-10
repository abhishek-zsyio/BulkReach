"""
Indeed scraper (Phase 2) — uses Playwright for JS-rendered pages.

Indeed blocks most direct scraping in some regions; this implementation
uses Playwright headless browser to bypass basic anti-bot systems.
"""
import logging
import time
import random
import urllib.parse
from typing import List, Dict
from .base_scraper import BaseScraper

logger = logging.getLogger(__name__)

INDEED_CARD_SELECTORS = [
    "div.job_seen_beacon",          # main listing card (2022–2025)
    "div.jobsearch-SerpJobCard",    # older layout
    "div.slider_container",
    "div[class*='job_seen']",
]
INDEED_TITLE_SELECTORS = [
    "h2.jobTitle a",
    "h2.jobTitle span[title]",
    "a[data-jk]",
    "span.jobTitle a",
]
INDEED_COMPANY_SELECTORS = [
    "span.companyName",
    "span[class*='companyName']",
    "div.companyInfo span",
    "[data-testid='company-name']",
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


class IndeedScraper(BaseScraper):
    """
    Scrapes Indeed job listings using Playwright.
    Supports pagination (10 results per page on Indeed).
    Extracts: job_title, company, source_url.
    """

    BASE_URL = "https://www.indeed.com/jobs"
    RESULTS_PER_PAGE = 10
    MIN_DELAY = 1.0
    MAX_DELAY = 3.0

    def scrape(self, keywords: str, location: str, max_results: int = 50) -> List[Dict]:
        """Scrape Indeed job listings and return structured contact data."""
        try:
            from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
        except ImportError:
            logger.error("Playwright not installed.")
            return []

        encoded_kw = urllib.parse.quote(keywords)
        encoded_loc = urllib.parse.quote(location)
        results: List[Dict] = []
        start = 0

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
                page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

                while len(results) < max_results:
                    url = f"{self.BASE_URL}?q={encoded_kw}&l={encoded_loc}&start={start}"
                    try:
                        page.goto(url, timeout=30_000, wait_until="domcontentloaded")
                        time.sleep(random.uniform(self.MIN_DELAY, self.MAX_DELAY))

                        # Wait for job cards to load
                        job_cards = []
                        for sel in INDEED_CARD_SELECTORS:
                            try:
                                page.wait_for_selector(sel, timeout=8_000)
                                job_cards = page.query_selector_all(sel)
                                if job_cards:
                                    break
                            except PlaywrightTimeout:
                                continue

                        if not job_cards:
                            logger.info("Indeed: no results on page %d, stopping.", start)
                            break

                        for card in job_cards:
                            if len(results) >= max_results:
                                break
                            try:
                                title = _try_selector(card, INDEED_TITLE_SELECTORS)
                                company = _try_selector(card, INDEED_COMPANY_SELECTORS)
                                link = _try_selector(card, INDEED_TITLE_SELECTORS, attr="href")

                                if link and link.startswith("/"):
                                    link = f"https://www.indeed.com{link}"
                                elif not link:
                                    link = url

                                if not title or not company:
                                    continue

                                results.append({
                                    "job_title": title,
                                    "company": company,
                                    "source_url": link,
                                })
                            except Exception as ex:
                                logger.debug("Indeed card parse error: %s", ex)
                                continue

                        if len(job_cards) < 5:
                            break

                        start += self.RESULTS_PER_PAGE

                    except Exception as exc:
                        logger.error("Indeed scrape request failed at start %d: %s", start, exc)
                        break
        except Exception as exc:
            logger.error("Indeed scraper browser context failed: %s", exc)

        logger.info("Indeed scraper returned %d raw results.", len(results))
        return self._resolve_contacts_concurrently(results[:max_results])
