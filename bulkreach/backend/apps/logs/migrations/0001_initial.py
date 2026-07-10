"""Logs app migration — initial."""
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("campaigns", "0001_initial"),
        ("recipients", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="SendLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True)),
                ("campaign", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="send_logs",
                    to="campaigns.campaign",
                )),
                ("recipient", models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="send_logs",
                    to="recipients.recipientlist",
                )),
                ("timestamp", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("event_type", models.CharField(
                    choices=[("sent", "Sent"), ("failed", "Failed"), ("bounced", "Bounced")],
                    db_index=True,
                    max_length=10,
                )),
                ("gmail_message_id", models.CharField(blank=True, max_length=255)),
                ("error_detail", models.TextField(blank=True)),
            ],
            options={"ordering": ["-timestamp"], "verbose_name": "Send Log"},
        ),
    ]
