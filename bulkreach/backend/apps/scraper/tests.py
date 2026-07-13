from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import ScrapeJob, ScrapedContact, CompanyEnrichment, CompanyEmployee

User = get_user_model()

class ScraperHistoryClearTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="testpassword")
        self.client.force_authenticate(user=self.user)
        
        # Create some scrape jobs
        self.job1 = ScrapeJob.objects.create(
            user=self.user,
            platform="linkedin",
            keywords="python developer",
            location="Remote",
            status=ScrapeJob.Status.DONE,
            result_count=2
        )
        self.contact1 = ScrapedContact.objects.create(
            job=self.job1,
            name="John Doe",
            email="john@example.com",
            company="Tech Corp"
        )
        self.contact2 = ScrapedContact.objects.create(
            job=self.job1,
            name="Jane Smith",
            email="jane@example.com",
            company="Innovate LLC"
        )
        
        self.job2 = ScrapeJob.objects.create(
            user=self.user,
            platform="indeed",
            keywords="react developer",
            location="New York",
            status=ScrapeJob.Status.DONE,
            result_count=1
        )
        self.contact3 = ScrapedContact.objects.create(
            job=self.job2,
            name="Bob Johnson",
            email="bob@example.com",
            company="App Ventures"
        )

    def test_delete_single_job(self):
        url = reverse("scrape-job-detail", kwargs={"pk": self.job1.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that job1 and its contacts are deleted
        self.assertFalse(ScrapeJob.objects.filter(id=self.job1.id).exists())
        self.assertFalse(ScrapedContact.objects.filter(job=self.job1).exists())
        
        # Check that job2 and its contacts still exist
        self.assertTrue(ScrapeJob.objects.filter(id=self.job2.id).exists())
        self.assertTrue(ScrapedContact.objects.filter(job=self.job2).exists())

    def test_clear_all_jobs(self):
        url = reverse("scrape-job-list-create")
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that all jobs and contacts are deleted for this user
        self.assertEqual(ScrapeJob.objects.filter(user=self.user).count(), 0)
        self.assertEqual(ScrapedContact.objects.count(), 0)

from unittest.mock import patch, MagicMock

class ScrapedContactExtractRecruiterTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser2", password="testpassword2")
        self.user.gemini_api_key = "fake-key"
        self.user.save()
        self.client.force_authenticate(user=self.user)
        
        self.job = ScrapeJob.objects.create(
            user=self.user,
            platform="linkedin",
            keywords="python developer",
            location="Remote",
            status=ScrapeJob.Status.DONE
        )
        self.contact = ScrapedContact.objects.create(
            job=self.job,
            name="Original Recruiter",
            email="original@example.com",
            company="Tech Corp",
            source_url="https://example.com/job/1"
        )

    def test_extract_without_api_key(self):
        self.user.gemini_api_key = ""
        self.user.save()
        url = reverse("scraped-contact-extract-recruiter", kwargs={"pk": self.contact.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Gemini API key is required", response.data["error"])

    @patch("requests.get")
    @patch("google.genai.Client")
    def test_extract_recruiter_fallback_success(self, mock_client_cls, mock_get):
        # Mock requests.get to return a simulated Yahoo Search results page
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = """
        <div class="algo">
            <h3><a href="https://linkedin.com/in/jane-recruiter">Jane Recruiter - HR Tech Corp</a></h3>
            <div class="compText">Talent Acquisition Lead at Tech Corp</div>
        </div>
        """
        mock_get.return_value = mock_response

        # Mock genai client
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        mock_generate = MagicMock()
        mock_generate.text = '{"recruiter_name": "Jane Recruiter", "recruiter_email": "jane@techcorp.com"}'
        mock_client.models.generate_content.return_value = mock_generate

        url = reverse("scraped-contact-extract-recruiter", kwargs={"pk": self.contact.id})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["success"], True)
        self.assertEqual(response.data["name"], "Jane Recruiter")
        self.assertEqual(response.data["email"], "jane@techcorp.com")


class CompanyEnrichmentAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser3", password="testpassword3")
        self.user.gemini_api_key = "fake-key"
        self.user.save()
        self.client.force_authenticate(user=self.user)

        self.enrichment = CompanyEnrichment.objects.create(
            user=self.user,
            company_name="Google",
            domain="google.com",
            status=CompanyEnrichment.Status.DONE
        )
        self.employee = CompanyEmployee.objects.create(
            company=self.enrichment,
            name="John Doe",
            job_title="Software Engineer",
            linkedin_url="https://linkedin.com/in/johndoe",
            email="johndoe@google.com"
        )

        from apps.campaigns.models import Campaign
        self.campaign = Campaign.objects.create(
            user=self.user,
            name="Test Campaign",
        )

    def test_list_enrichments(self):
        url = reverse("company-enrichment-list-create")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["company_name"], "Google")

    @patch("apps.scraper.tasks.run_company_enrichment.delay")
    def test_create_enrichment(self, mock_delay):
        url = reverse("company-enrichment-list-create")
        response = self.client.post(url, {"company_name": "Stripe", "job_titles": ["HR"]})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["company_name"], "Stripe")
        self.assertEqual(response.data["status"], "pending")
        mock_delay.assert_called_once()

    def test_detail_enrichment(self):
        url = reverse("company-enrichment-detail", kwargs={"pk": self.enrichment.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["company_name"], "Google")
        self.assertEqual(len(response.data["employees"]), 1)
        self.assertEqual(response.data["employees"][0]["name"], "John Doe")

    def test_delete_enrichment(self):
        url = reverse("company-enrichment-detail", kwargs={"pk": self.enrichment.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(CompanyEnrichment.objects.filter(id=self.enrichment.id).exists())
        self.assertFalse(CompanyEmployee.objects.filter(id=self.employee.id).exists())

    def test_import_employees(self):
        url = reverse("company-enrichment-import", kwargs={"pk": self.enrichment.id})
        response = self.client.post(url, {
            "campaign_id": self.campaign.id,
            "employee_ids": [self.employee.id]
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

        # Verify recipient list
        from apps.recipients.models import RecipientList
        self.assertTrue(RecipientList.objects.filter(campaign=self.campaign, email="johndoe@google.com").exists())


class ProfileResearchAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser_pr", password="testpassword_pr")
        self.user.gemini_api_key = "fake-key"
        self.user.save()
        self.client.force_authenticate(user=self.user)

        from apps.scraper.models import ProfileResearch
        self.research = ProfileResearch.objects.create(
            user=self.user,
            profile_url="https://linkedin.com/in/priya-sharma-developer",
            status=ProfileResearch.Status.DONE,
            name="Priya Sharma",
            job_title="Frontend Developer",
            company="Self",
            email="priya@example.com"
        )

    def test_list_researches(self):
        url = reverse("profile-research-list-create")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Priya Sharma")

    @patch("apps.scraper.tasks.run_profile_research.delay")
    def test_create_research(self, mock_delay):
        url = reverse("profile-research-list-create")
        response = self.client.post(url, {"profile_url": "https://linkedin.com/in/priya-dev"})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Verify the URL is correctly normalized
        self.assertEqual(response.data["profile_url"], "https://www.linkedin.com/in/priya-dev")
        self.assertEqual(response.data["status"], "pending")
        mock_delay.assert_called_once()

    def test_clean_linkedin_profile_url_utility(self):
        from apps.scraper.tasks import clean_linkedin_profile_url
        
        test_cases = [
            ("https://in.linkedin.com/in/john-doe-123/?abc=123", ("https://www.linkedin.com/in/john-doe-123", "john-doe-123")),
            ("http://www.linkedin.com/in/john-doe-123?abc=123", ("https://www.linkedin.com/in/john-doe-123", "john-doe-123")),
            ("linkedin.com/in/john-doe-123", ("https://www.linkedin.com/in/john-doe-123", "john-doe-123")),
            ("john-doe-123", ("https://www.linkedin.com/in/john-doe-123", "john-doe-123")),
            ("https://www.linkedin.com/in/john-doe-123/", ("https://www.linkedin.com/in/john-doe-123", "john-doe-123")),
        ]
        
        for input_url, expected in test_cases:
            self.assertEqual(clean_linkedin_profile_url(input_url), expected)

    def test_detail_research(self):
        url = reverse("profile-research-detail", kwargs={"pk": self.research.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Priya Sharma")

    def test_delete_research(self):
        from apps.scraper.models import ProfileResearch
        url = reverse("profile-research-detail", kwargs={"pk": self.research.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(ProfileResearch.objects.filter(id=self.research.id).exists())

