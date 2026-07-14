"""Scraper app — URL routing (Phase 2)."""
from django.urls import path
from .views import (
    ScrapeJobListCreateView,
    ScrapeJobDetailView,
    ScrapeJobResultsView,
    ScrapeJobImportView,
    ScrapeJobExportView,
    ScrapeJobCancelView,
    ScrapeJobRetryView,
    ScrapedContactDetailView,
    ScrapedContactExtractRecruiterView,
    ScrapedContactBulkDeleteView,
    CompanyEnrichmentListCreateView,
    CompanyEnrichmentDetailView,
    CompanyEnrichmentImportView,
    ProfileResearchListCreateView,
    ProfileResearchDetailView,
)

urlpatterns = [
    path("jobs/", ScrapeJobListCreateView.as_view(), name="scrape-job-list-create"),
    path("jobs/<int:pk>/", ScrapeJobDetailView.as_view(), name="scrape-job-detail"),
    path("jobs/<int:pk>/results/", ScrapeJobResultsView.as_view(), name="scrape-job-results"),
    path("jobs/<int:pk>/import/", ScrapeJobImportView.as_view(), name="scrape-job-import"),
    path("jobs/<int:pk>/export/", ScrapeJobExportView.as_view(), name="scrape-job-export"),
    path("jobs/<int:pk>/cancel/", ScrapeJobCancelView.as_view(), name="scrape-job-cancel"),
    path("jobs/<int:pk>/retry/", ScrapeJobRetryView.as_view(), name="scrape-job-retry"),
    path("contacts/bulk-delete/", ScrapedContactBulkDeleteView.as_view(), name="contacts-bulk-delete"),
    path("contacts/<int:pk>/", ScrapedContactDetailView.as_view(), name="scraped-contact-detail"),
    path("contacts/<int:pk>/extract-recruiter/", ScrapedContactExtractRecruiterView.as_view(), name="scraped-contact-extract-recruiter"),
    path("companies/", CompanyEnrichmentListCreateView.as_view(), name="company-enrichment-list-create"),
    path("companies/<int:pk>/", CompanyEnrichmentDetailView.as_view(), name="company-enrichment-detail"),
    path("companies/<int:pk>/import/", CompanyEnrichmentImportView.as_view(), name="company-enrichment-import"),
    path("profiles/", ProfileResearchListCreateView.as_view(), name="profile-research-list-create"),
    path("profiles/<int:pk>/", ProfileResearchDetailView.as_view(), name="profile-research-detail"),
]

