"""
Foundit (Monster) scraper (Phase 2) — uses Playwright for JS-rendered pages.
"""
import logging
import time
import random
import urllib.parse
from typing import List, Dict
from .base_scraper import BaseScraper

logger = logging.getLogger(__name__)

class FounditScraper(BaseScraper):
    BASE_URL = "https://www.foundit.in/srp/results"
    MIN_DELAY = 1.0
    MAX_DELAY = 2.5
    
    def scrape(self, keywords: str, location: str, max_results: int = 50) -> List[Dict]:
        try:
            from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
        except ImportError:
            logger.error("Playwright not installed.")
            return []
            
        results: List[Dict] = []
        start = 0
        
        encoded_kw = urllib.parse.quote(keywords)
        encoded_loc = urllib.parse.quote(location)
        
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
                
                while len(results) < max_results:
                    url = f"{self.BASE_URL}?query={encoded_kw}&locations={encoded_loc}&start={start}"
                    
                    try:
                        page.goto(url, timeout=30_000, wait_until="domcontentloaded")
                        time.sleep(random.uniform(self.MIN_DELAY, self.MAX_DELAY))
                        
                        try:
                            page.wait_for_selector("div.job-apply-card, div.srpResultCard, div.srpJobResult", timeout=8_000)
                            job_cards = page.query_selector_all("div.job-apply-card, div.srpResultCard, div.srpJobResult")
                        except PlaywrightTimeout:
                            logger.info("Foundit: no job cards found at start %d.", start)
                            break
                            
                        if not job_cards:
                            break
                            
                        for card in job_cards:
                            if len(results) >= max_results:
                                break
                                
                            try:
                                title_el = card.query_selector("div.jobTitle h2 a, a[href*='/job/']")
                                company_el = card.query_selector("span.companyName a, span.companyName, p.companyName a")
                                
                                if not title_el or not company_el:
                                    continue
                                    
                                title = title_el.inner_text().strip()
                                company = company_el.inner_text().strip()
                                link = title_el.get_attribute("href")
                                
                                if link and not link.startswith("http"):
                                    link = f"https://www.foundit.in{link}"
                                    
                                results.append({
                                    "job_title": title,
                                    "company": company,
                                    "source_url": link,
                                })
                            except Exception as ex:
                                logger.debug("Foundit card parse error: %s", ex)
                                continue
                                
                        start += 15 # Foundit usually paginates by 15
                        
                    except Exception as exc:
                        logger.error("Foundit scraper page request failed: %s", exc)
                        break
                        
        except Exception as exc:
            logger.error("Foundit scraper browser context failed: %s", exc)
            
        logger.info("Foundit scraper returned %d raw results.", len(results))
        return self._resolve_contacts_concurrently(results[:max_results])
