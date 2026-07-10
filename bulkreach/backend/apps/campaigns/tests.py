from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.campaigns.models import Campaign, EmailTemplate, JobApplication
from apps.recipients.models import RecipientList

User = get_user_model()

class JobApplicationTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", email="test@test.com", password="password")
        self.template = EmailTemplate.objects.create(
            user=self.user,
            name="Test Template",
            subject="Hello {{ recipient_name }}",
            html_body="Welcome to {{ company_name }}"
        )
        self.campaign = Campaign.objects.create(
            user=self.user,
            name="Test Campaign",
            template=self.template
        )
        self.recipient = RecipientList.objects.create(
            campaign=self.campaign,
            email="candidate@target.com",
            name="John Doe",
            raw_data={"company_name": "TargetCorp", "job_title": "Software Engineer"}
        )

    def test_promote_or_create_new(self):
        JobApplication.promote_or_create(self.campaign, self.recipient)
        app = JobApplication.objects.get(user=self.user, company_name="TargetCorp")
        self.assertEqual(app.stage, JobApplication.Stage.APPLIED)
        self.assertEqual(app.job_title, "Software Engineer")
        self.assertEqual(app.contact_name, "John Doe")
        self.assertEqual(app.contact_email, "candidate@target.com")

    def test_promote_existing_saved(self):
        saved_app = JobApplication.objects.create(
            user=self.user,
            company_name="TargetCorp",
            job_title="Dev Roles",
            stage=JobApplication.Stage.SAVED
        )
        JobApplication.promote_or_create(self.campaign, self.recipient)
        saved_app.refresh_from_db()
        self.assertEqual(saved_app.stage, JobApplication.Stage.APPLIED)
        self.assertEqual(saved_app.contact_name, "John Doe")
        self.assertEqual(saved_app.contact_email, "candidate@target.com")
