"""Scraper app migration — initial."""
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="ScrapeJob",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True)),
                ("user", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="scrape_jobs",
                    to="accounts.userprofile",
                )),
                ("platform", models.CharField(
                    choices=[("linkedin", "LinkedIn"), ("naukri", "Naukri"), ("indeed", "Indeed")],
                    max_length=20,
                )),
                ("keywords", models.CharField(max_length=500)),
                ("location", models.CharField(blank=True, max_length=200)),
                ("max_results", models.PositiveIntegerField(default=50)),
                ("status", models.CharField(
                    choices=[("pending", "Pending"), ("running", "Running"), ("done", "Done"), ("failed", "Failed")],
                    db_index=True, default="pending", max_length=10,
                )),
                ("result_count", models.PositiveIntegerField(default=0)),
                ("error_message", models.TextField(blank=True)),
                ("celery_task_id", models.CharField(blank=True, max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
            ],
            options={"ordering": ["-created_at"], "verbose_name": "Scrape Job"},
        ),
        migrations.CreateModel(
            name="ScrapedContact",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True)),
                ("job", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="contacts",
                    to="scraper.scrapejob",
                )),
                ("name", models.CharField(blank=True, max_length=255)),
                ("email", models.EmailField(blank=True)),
                ("company", models.CharField(blank=True, max_length=255)),
                ("job_title", models.CharField(blank=True, max_length=255)),
                ("linkedin_url", models.URLField(blank=True)),
                ("source_url", models.URLField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["created_at"], "verbose_name": "Scraped Contact"},
        ),
    ]
