"""
Dice scraper (Phase 2) — uses Playwright for JS-rendered pages.
"""
import logging
import time
import random
import urllib.parse
from typing import List, Dict
from .base_scraper import BaseScraper

logger = logging.getLogger(__name__)

class DiceScraper(BaseScraper):
    BASE_URL = "https://www.dice.com/jobs"
    MIN_DELAY = 1.0
    MAX_DELAY = 2.5
    
    def scrape(self, keywords: str, location: str, max_results: int = 50, **kwargs) -> List[Dict]:
        try:
            from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
        except ImportError:
            logger.error("Playwright not installed.")
            return []
            
        results: List[Dict] = []
        page_num = 1
        
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
                    url = f"{self.BASE_URL}?q={encoded_kw}&location={encoded_loc}&page={page_num}&pageSize=20"
                    
                    try:
                        page.goto(url, timeout=30_000, wait_until="domcontentloaded")
                        time.sleep(random.uniform(self.MIN_DELAY, self.MAX_DELAY))
                        
                        try:
                            page.wait_for_selector("div.card, dhi-search-card", timeout=8_000)
                            job_cards = page.query_selector_all("div.card, dhi-search-card")
                        except PlaywrightTimeout:
                            logger.info("Dice: no job cards found on page %d.", page_num)
                            break
                            
                        if not job_cards:
                            break
                            
                        for card in job_cards:
                            if len(results) >= max_results:
                                break
                                
                            try:
                                title_el = card.query_selector("a.card-title-link, a[data-cy='card-title-link']")
                                company_el = card.query_selector("a[data-cy='search-result-company-name'], span.comp-name")
                                
                                if not title_el or not company_el:
                                    continue
                                    
                                title = title_el.inner_text().strip()
                                company = company_el.inner_text().strip()
                                link = title_el.get_attribute("href")
                                
                                if link and not link.startswith("http"):
                                    link = f"https://www.dice.com{link}"
                                    
                                results.append({
                                    "job_title": title,
                                    "company": company,
                                    "source_url": link,
                                })
                            except Exception as ex:
                                logger.debug("Dice card parse error: %s", ex)
                                continue
                                
                        page_num += 1
                        
                    except Exception as exc:
                        logger.error("Dice scraper page request failed: %s", exc)
                        break
                        
        except Exception as exc:
            logger.error("Dice scraper browser context failed: %s", exc)
            
        logger.info("Dice scraper returned %d raw results.", len(results))
        return self._resolve_contacts_concurrently(results[:max_results])
