"""
Campaigns Celery tasks — bulk email send task.
All tasks are idempotent: safe to retry on failure.
"""
import time
import logging
from celery import shared_task
from django.core.signing import Signer
from django.conf import settings
from django.utils import timezone
from django.db import transaction, DatabaseError
from django.db.models import F

logger = logging.getLogger(__name__)

# How often (in recipients) to poll DB for pause/cancel signal.
# Avoids one DB query per email for large campaigns.
_STATUS_CHECK_INTERVAL = 10


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    queue="emails",
    name="campaigns.send_campaign_emails",
    acks_late=True,
)
def send_campaign_emails(self, campaign_id: int) -> dict:
    """
    Bulk email send task — processes all pending recipients for a campaign.

    Steps per recipient:
      1. Render HTML body via TemplateRenderer (Jinja2 variable injection)
      2. Render subject line
      3. Attach resume PDF (if configured)
      4. Send via EmailSender (Gmail API → SMTP fallback)
      5. Update RecipientList status (sent / failed)
      6. Write SendLog entry
      7. Increment Campaign.sent_count / failed_count
      8. Sleep send_delay_seconds to respect Gmail rate limits

    Idempotency: Only processes recipients with status=pending,
    so re-running after a partial failure skips already-sent rows.
    """
    from apps.campaigns.models import Campaign
    from apps.recipients.models import RecipientList
    from apps.logs.models import SendLog
    from apps.campaigns.services.template_renderer import TemplateRenderer
    from apps.campaigns.services.email_sender import EmailSender

    try:
        campaign = Campaign.objects.select_related("user", "template").get(pk=campaign_id)
    except Campaign.DoesNotExist:
        logger.error("send_campaign_emails: Campaign %s not found.", campaign_id)
        return {"error": "Campaign not found."}

    # Update status to running
    Campaign.objects.filter(pk=campaign_id).update(status=Campaign.Status.RUNNING)

    renderer = TemplateRenderer()
    sender = EmailSender(campaign.user)

    attachment_path = None
    if campaign.resume and campaign.resume.file:
        attachment_path = campaign.resume.file.path
    elif campaign.resume_attachment and campaign.resume_attachment.name:
        attachment_path = campaign.resume_attachment.path

    # Tracking pixels are only injected when tracking is enabled AND plain_text_mode is off.
    # plain_text_mode always wins — no pixel in plain-text emails.
    tracking_active = campaign.open_tracking_enabled and not campaign.plain_text_mode
    signer = Signer() if tracking_active else None
    backend_url = settings.BACKEND_URL.rstrip("/") if tracking_active else ""

    pending_ids = list(
        RecipientList.objects.filter(
            campaign=campaign,
            status=RecipientList.Status.PENDING,
        ).values_list("id", flat=True)
    )

    # Cache campaign status to avoid querying DB every iteration.
    # We refresh every _STATUS_CHECK_INTERVAL recipients instead.
    current_status = campaign.status

    for loop_idx, recipient_id in enumerate(pending_ids):
        # Check for paused / cancelled — but only every N recipients to reduce DB load
        if loop_idx % _STATUS_CHECK_INTERVAL == 0:
            current_status = (
                Campaign.objects.filter(pk=campaign_id)
                .values_list("status", flat=True)
                .first()
            )
        if current_status in (Campaign.Status.PAUSED, Campaign.Status.CANCELLED):
            logger.info(
                "Campaign %s is %s — stopping send loop.", campaign_id, current_status
            )
            break

        recipient = None
        try:
            with transaction.atomic():
                recipient = RecipientList.objects.select_for_update(nowait=True).get(
                    pk=recipient_id,
                    status=RecipientList.Status.PENDING,
                )

                row_data = recipient.raw_data or {}

                # Ensure standard variables are always available for the template
                row_data["recipient_email"] = recipient.email
                row_data["recipient_name"] = recipient.name
                row_data["sender_name"] = (
                    getattr(campaign.user, "sender_name", "") or campaign.user.username
                )
                row_data["sender_email"] = campaign.user.email

                email_address = recipient.email

                try:
                    html_body = renderer.render(campaign.template.html_body, row_data)
                    subject = renderer.render_subject(campaign.subject_template, row_data)

                    # Build tracking pixel snippet (None when not applicable)
                    tracking_pixel_html = None
                    if tracking_active and signer:
                        token = signer.sign(str(recipient.id))
                        track_url = f"{backend_url}/api/recipients/track/{token}/"
                        tracking_pixel_html = (
                            f'<img src="{track_url}" width="1" height="1" '
                            f'style="display:none !important;" alt="" />'
                        )

                    message_id = sender.send(
                        to=email_address,
                        subject=subject,
                        html_body=html_body,
                        attachment_path=attachment_path,
                        plain_text_mode=campaign.plain_text_mode,
                        tracking_pixel_html=tracking_pixel_html,
                    )

                    recipient.status = RecipientList.Status.SENT
                    recipient.sent_at = timezone.now()
                    recipient.save(update_fields=["status", "sent_at"])

                    try:
                        from apps.campaigns.models import JobApplication
                        JobApplication.promote_or_create(campaign, recipient)
                    except Exception as app_exc:
                        logger.error("Failed to promote/create JobApplication: %s", app_exc)

                    SendLog.objects.create(
                        campaign=campaign,
                        recipient=recipient,
                        event_type=SendLog.EventType.SENT,
                        gmail_message_id=message_id,
                    )

                except Exception as exc:
                    error_detail = str(exc)
                    logger.error(
                        "Failed to send email to %s for campaign %s: %s",
                        email_address,
                        campaign_id,
                        error_detail,
                    )
                    recipient.status = RecipientList.Status.FAILED
                    recipient.error_message = error_detail[:500]
                    recipient.save(update_fields=["status", "error_message"])

                    SendLog.objects.create(
                        campaign=campaign,
                        recipient=recipient,
                        event_type=SendLog.EventType.FAILED,
                        error_detail=error_detail[:1000],
                    )

        except (RecipientList.DoesNotExist, DatabaseError) as exc:
            # Skip if recipient was already processed or is locked by another task run
            logger.debug("Recipient %s skipped or locked: %s", recipient_id, exc)
            continue

        # Atomic increment of campaign counters outside of lock transaction
        if recipient:
            with transaction.atomic():
                if recipient.status == RecipientList.Status.SENT:
                    Campaign.objects.filter(pk=campaign_id).update(sent_count=F("sent_count") + 1)
                elif recipient.status == RecipientList.Status.FAILED:
                    Campaign.objects.filter(pk=campaign_id).update(failed_count=F("failed_count") + 1)

            # Rate limiting — configurable delay
            time.sleep(max(0, campaign.send_delay_seconds))

    # Update counters cleanly from DB
    final_sent = RecipientList.objects.filter(campaign=campaign, status=RecipientList.Status.SENT).count()
    final_failed = RecipientList.objects.filter(campaign=campaign, status=RecipientList.Status.FAILED).count()

    final_status = Campaign.Status.DONE
    current_status = Campaign.objects.filter(pk=campaign_id).values_list("status", flat=True).first()
    if current_status in (Campaign.Status.PAUSED, Campaign.Status.CANCELLED):
        final_status = current_status
    elif final_failed > 0 and final_sent == 0:
        final_status = Campaign.Status.FAILED

    Campaign.objects.filter(pk=campaign_id).update(
        status=final_status,
        sent_count=final_sent,
        failed_count=final_failed,
        completed_at=timezone.now(),
    )

    logger.info(
        "Campaign %s completed: %d sent, %d failed. Status: %s",
        campaign_id,
        final_sent,
        final_failed,
        final_status,
    )
    return {
        "campaign_id": campaign_id,
        "sent": final_sent,
        "failed": final_failed,
        "status": final_status,
    }
