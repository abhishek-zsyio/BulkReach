"""Recipients app migration — initial."""
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("campaigns", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="RecipientList",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True)),
                ("campaign", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="recipients",
                    to="campaigns.campaign",
                )),
                ("email", models.EmailField(db_index=True)),
                ("name", models.CharField(blank=True, max_length=255)),
                ("raw_data", models.JSONField(default=dict)),
                ("status", models.CharField(
                    choices=[("pending", "Pending"), ("sent", "Sent"), ("failed", "Failed"), ("skipped", "Skipped")],
                    db_index=True,
                    default="pending",
                    max_length=10,
                )),
                ("error_message", models.TextField(blank=True)),
                ("sent_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["created_at"], "verbose_name": "Recipient", "unique_together": {("campaign", "email")}},
        ),
    ]
