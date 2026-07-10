"""
Administrative Celery tasks for the campaigns app.
These are background maintenance tasks not directly triggered by users.
"""
import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(
    name="campaigns.sync_template_campaigns",
    queue="emails",
    acks_late=True,
    max_retries=2,
)
def sync_template_campaigns(template_id: int) -> dict:
    """
    Asynchronously sync spreadsheet columns for all campaigns using a given template.

    Triggered whenever an EmailTemplate is saved so that the column mapping
    for every linked campaign is updated without blocking the API request.
    """
    from apps.campaigns.models import EmailTemplate
    from apps.campaigns.services.spreadsheet_sync import sync_campaign_columns

    try:
        template = EmailTemplate.objects.prefetch_related("campaigns").get(pk=template_id)
    except EmailTemplate.DoesNotExist:
        logger.warning("sync_template_campaigns: Template %s not found.", template_id)
        return {"error": "Template not found."}

    synced = 0
    errors = 0
    for campaign in template.campaigns.all():
        try:
            sync_campaign_columns(campaign)
            synced += 1
        except Exception as e:
            logger.error(
                "sync_template_campaigns: Error syncing campaign %s for template %s: %s",
                campaign.id,
                template_id,
                e,
            )
            errors += 1

    logger.info(
        "sync_template_campaigns: template=%s synced=%d errors=%d",
        template_id,
        synced,
        errors,
    )
    return {"template_id": template_id, "synced": synced, "errors": errors}
