"""Campaigns app migration — initial."""
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="EmailTemplate",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True)),
                ("user", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="email_templates",
                    to="accounts.userprofile",
                )),
                ("name", models.CharField(max_length=200)),
                ("html_body", models.TextField()),
                ("available_variables", models.JSONField(default=list)),
                ("is_default", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["-created_at"], "verbose_name": "Email Template"},
        ),
        migrations.CreateModel(
            name="Campaign",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True)),
                ("user", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="campaigns",
                    to="accounts.userprofile",
                )),
                ("name", models.CharField(max_length=200)),
                ("subject_template", models.CharField(max_length=500)),
                ("status", models.CharField(
                    choices=[
                        ("draft", "Draft"), ("queued", "Queued"), ("running", "Running"),
                        ("paused", "Paused"), ("done", "Done"),
                        ("failed", "Failed"), ("cancelled", "Cancelled"),
                    ],
                    default="draft",
                    max_length=20,
                    db_index=True,
                )),
                ("template", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="campaigns",
                    to="campaigns.emailtemplate",
                )),
                ("spreadsheet_file", models.FileField(blank=True, null=True, upload_to="spreadsheets/%Y/%m/")),
                ("column_mapping", models.JSONField(blank=True, default=dict)),
                ("resume_attachment", models.FileField(blank=True, null=True, upload_to="resumes/%Y/%m/")),
                ("send_delay_seconds", models.FloatField(default=1.5)),
                ("total_recipients", models.PositiveIntegerField(default=0)),
                ("sent_count", models.PositiveIntegerField(default=0)),
                ("failed_count", models.PositiveIntegerField(default=0)),
                ("celery_task_id", models.CharField(blank=True, max_length=255, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("started_at", models.DateTimeField(blank=True, null=True)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
            ],
            options={"ordering": ["-created_at"], "verbose_name": "Campaign"},
        ),
    ]
