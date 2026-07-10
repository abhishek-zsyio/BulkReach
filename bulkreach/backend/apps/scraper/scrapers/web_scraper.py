"""
Web scraper using DuckDuckGo to find ATS listings (Phase 2).
Uses the ddgs library to avoid DuckDuckGo rate limiting and anti-bot checks.
"""
import logging
import urllib.parse
from typing import List, Dict
from .base_scraper import BaseScraper

logger = logging.getLogger(__name__)

class WebScraper(BaseScraper):
    """
    Scrapes DuckDuckGo for ATS job listings (lever.co, greenhouse.io, etc) using ddgs.
    """

    def scrape(self, keywords: str, location: str, max_results: int = 50) -> List[Dict]:
        """Scrape Web for ATS job listings and return structured contact data."""
        try:
            from ddgs import DDGS
        except ImportError:
            logger.error("ddgs not installed.")
            return []

        ats_domains = "site:lever.co OR site:greenhouse.io OR site:ashbyhq.com OR site:workable.com"
        clean_kw = keywords.replace('"', '').replace('(', '').replace(')', '')
        clean_loc = location.replace('"', '').replace('(', '').replace(')', '')
        query = f'{clean_kw} {clean_loc} {ats_domains}'
        
        results: List[Dict] = []
        seen_urls = set()
        
        try:
            logger.info("WebScraper searching DDG (via api) for: %s", query)
            
            with DDGS() as ddgs:
                ddg_results = ddgs.text(query, max_results=max_results)
                
                if ddg_results:
                    for r in ddg_results:
                        if len(results) >= max_results:
                            break
                            
                        title = r.get("title", "")
                        link = r.get("href", "")
                        
                        if not title or not link or link in seen_urls:
                            continue
                            
                        company = "Unknown"
                        if "lever.co/" in link:
                            parts = link.split("lever.co/")
                            if len(parts) > 1:
                                company = parts[1].split("/")[0].replace("-", " ").title()
                        elif "greenhouse.io/" in link:
                            parts = link.split("greenhouse.io/")
                            if len(parts) > 1:
                                company = parts[1].split("/")[0].replace("-", " ").title()
                        elif "ashbyhq.com/" in link:
                            parts = link.split("ashbyhq.com/")
                            if len(parts) > 1:
                                company = parts[1].split("/")[0].replace("-", " ").title()
                        elif "workable.com/" in link:
                            parts = link.split("workable.com/")
                            if len(parts) > 1:
                                company = parts[1].split("/")[0].replace("-", " ").title()
                        
                        name, email = self._extract_contact_info(link, company)
                        
                        results.append(self._normalize_result({
                            "name": name,
                            "email": email,
                            "job_title": title,
                            "company": company,
                            "source_url": link,
                        }))
                        seen_urls.add(link)
                            
        except Exception as exc:
            logger.error("WebScraper request failed: %s", exc)

        logger.info("WebScraper returned %d results.", len(results))
        return results[:max_results]
