"""Scraper app — models (Phase 2)."""
from django.db import models
from django.conf import settings


class ScrapeJob(models.Model):
    """Represents a scraping job targeting a job listings platform."""

    class Platform(models.TextChoices):
        LINKEDIN = "linkedin", "LinkedIn"
        NAUKRI = "naukri", "Naukri"
        INDEED = "indeed", "Indeed"
        WEB = "web", "Web Search (DuckDuckGo)"
        GLASSDOOR = "glassdoor", "Glassdoor"
        WELLFOUND = "wellfound", "Wellfound"
        FOUNDIT = "foundit", "Foundit (Monster)"
        DICE = "dice", "Dice"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        DONE = "done", "Done"
        FAILED = "failed", "Failed"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="scrape_jobs",
    )
    campaign = models.ForeignKey(
        "campaigns.Campaign",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="scrape_jobs",
    )
    platform = models.CharField(max_length=20, choices=Platform.choices)
    keywords = models.CharField(max_length=500)
    location = models.CharField(max_length=200, blank=True)
    max_results = models.PositiveIntegerField(default=50)
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING, db_index=True
    )
    result_count = models.PositiveIntegerField(default=0)
    error_message = models.TextField(blank=True)
    celery_task_id = models.CharField(max_length=255, blank=True)
    use_ai_matching = models.BooleanField(default=True)
    freshness = models.CharField(max_length=20, default="any")
    company_size = models.CharField(max_length=20, default="any")
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Scrape Job"
        verbose_name_plural = "Scrape Jobs"

    def __str__(self):
        return f"[{self.platform}] {self.keywords} ({self.status})"


class ScrapedContact(models.Model):
    """A single contact discovered via a scrape job."""

    job = models.ForeignKey(
        ScrapeJob,
        on_delete=models.CASCADE,
        related_name="contacts",
    )
    name = models.CharField(max_length=255, blank=True)
    email = models.EmailField(blank=True)
    company = models.CharField(max_length=255, blank=True)
    job_title = models.CharField(max_length=255, blank=True)
    linkedin_url = models.URLField(max_length=10000, blank=True)
    source_url = models.URLField(max_length=10000, blank=True)
    custom_variables = models.JSONField(default=dict, blank=True)
    posted_date = models.CharField(max_length=100, blank=True, null=True, default="")
    location = models.CharField(max_length=500, blank=True, default="")
    salary = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]
        verbose_name = "Scraped Contact"
        verbose_name_plural = "Scraped Contacts"

    def __str__(self):
        return f"{self.name} <{self.email}> @ {self.company}"


class CompanyEnrichment(models.Model):
    """Represents a company enrichment job search."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        DONE = "done", "Done"
        FAILED = "failed", "Failed"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="company_enrichments",
    )
    company_name = models.CharField(max_length=255)
    domain = models.CharField(max_length=255, blank=True)
    logo_url = models.URLField(max_length=1000, blank=True)
    website = models.URLField(max_length=1000, blank=True)
    description = models.TextField(blank=True)
    industry = models.CharField(max_length=255, blank=True)
    location = models.CharField(max_length=255, blank=True)
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Company Enrichment"
        verbose_name_plural = "Company Enrichments"

    def __str__(self):
        return f"{self.company_name} ({self.status})"


class CompanyEmployee(models.Model):
    """Represents an employee discovered during company enrichment."""

    company = models.ForeignKey(
        CompanyEnrichment,
        on_delete=models.CASCADE,
        related_name="employees",
    )
    name = models.CharField(max_length=255)
    job_title = models.CharField(max_length=255, blank=True)
    linkedin_url = models.URLField(max_length=2000, blank=True)
    email = models.EmailField(blank=True)
    role_description = models.TextField(blank=True)
    profile_insights = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]
        verbose_name = "Company Employee"
        verbose_name_plural = "Company Employees"

    def __str__(self):
        return f"{self.name} - {self.job_title} @ {self.company.company_name}"

