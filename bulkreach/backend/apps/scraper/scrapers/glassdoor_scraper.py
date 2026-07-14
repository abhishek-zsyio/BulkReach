"""
Glassdoor scraper (Phase 2) — uses Playwright for JS-rendered pages.
"""
import logging
import random
import time
import urllib.parse
from typing import List, Dict
from .base_scraper import BaseScraper

logger = logging.getLogger(__name__)

_CARD_SELECTORS = [
    "li[class*='JobsList_jobListItem']",
    "li.react-job-listing",
]
_TITLE_SELECTORS = [
    "a[data-test='job-link']",
    "a.jobLink",
]
_COMPANY_SELECTORS = [
    "span[class*='EmployerProfile_employerName']",
    "div.job-search-8wag7x",
    "div[class*='job-search']",
]
_LINK_SELECTORS = _TITLE_SELECTORS

def _try_selector(element, selectors: list, attr: str = None) -> str:
    for sel in selectors:
        try:
            el = element.query_selector(sel)
            if el:
                if attr:
                    val = el.get_attribute(attr)
                else:
                    val = el.inner_text()
                if val:
                    # Glassdoor company names sometimes include the rating, split it out
                    text = val.strip()
                    if not attr and '\n' in text:
                        text = text.split('\n')[0].strip()
                    return text
        except Exception:
            continue
    return ""

class GlassdoorScraper(BaseScraper):
    BASE_URL = "https://www.glassdoor.com/Job/jobs.htm"
    MIN_DELAY = 1.5
    MAX_DELAY = 3.5

    def scrape(self, keywords: str, location: str, max_results: int = 50, **kwargs) -> List[Dict]:
        try:
            from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
        except ImportError:
            logger.error("Playwright not installed.")
            return []

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
                page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
                
                url = f"{self.BASE_URL}?sc.keyword={encoded_kw}"
                if location:
                    url += f"&locT=C&locId=&locKeyword={encoded_loc}"
                
                try:
                    page.goto(url, timeout=30_000, wait_until="domcontentloaded")
                    time.sleep(random.uniform(self.MIN_DELAY, self.MAX_DELAY))
                    
                    # Handle potential Glassdoor sign-in modal
                    try:
                        close_btn = page.query_selector("button.CloseButton")
                        if close_btn:
                            close_btn.click()
                    except Exception:
                        pass
                    
                    job_cards = []
                    for sel in _CARD_SELECTORS:
                        try:
                            page.wait_for_selector(sel, timeout=5_000)
                            job_cards = page.query_selector_all(sel)
                            if job_cards:
                                break
                        except PlaywrightTimeout:
                            continue
                            
                    for card in job_cards:
                        if len(results) >= max_results:
                            break
                        try:
                            title = _try_selector(card, _TITLE_SELECTORS)
                            company = _try_selector(card, _COMPANY_SELECTORS)
                            link = _try_selector(card, _LINK_SELECTORS, attr="href")

                            if link and not link.startswith("http"):
                                link = f"https://www.glassdoor.com{link}"

                            if not title or not company:
                                continue

                            results.append({
                                "job_title": title,
                                "company": company,
                                "source_url": link,
                            })
                        except Exception as ex:
                            logger.debug("Glassdoor card parse error: %s", ex)
                            continue

                except Exception as exc:
                    logger.error("Glassdoor scraper page loop failed: %s", exc)
                finally:
                    context.close()
                    browser.close()
        except Exception as exc:
            logger.error("Glassdoor scraper browser context failed: %s", exc)

        logger.info("Glassdoor scraper returned %d raw results.", len(results))
        return self._resolve_contacts_concurrently(results[:max_results])
