"""
Spreadsheet sync coordinator — synchronizes spreadsheet columns and headers 
with email template variables, updates column mapping, and updates recipient raw_data.
"""
import logging
import os
from apps.campaigns.services.spreadsheet_parser import SpreadsheetParser

logger = logging.getLogger(__name__)


def sync_campaign_columns(campaign):
    """
    Coordinates column updating for both local spreadsheet file and linked Google Sheet.
    Also updates campaign's column_mapping and recipient database rows.
    """
    if not campaign.template:
        return

    variables = campaign.template.available_variables or []
    
    # 1. Update local spreadsheet if it exists
    if campaign.spreadsheet_file:
        try:
            file_path = campaign.spreadsheet_file.path
            if os.path.exists(file_path):
                parser = SpreadsheetParser()
                df = parser._load_dataframe(file_path)
                existing_cols_lower = [str(c).lower().strip() for c in df.columns]
                
                current_mapping = dict(campaign.column_mapping or {})
                mapped_vars = set(current_mapping.values())
                
                new_cols_to_add = []
                for var in variables:
                    var_clean = var.strip()
                    # Skip email/name since they are handled natively/mapped already
                    if var_clean.lower() in ["email", "name", "recipient_email", "recipient_name"]:
                        continue
                    
                    if var_clean in mapped_vars or var_clean.lower() in existing_cols_lower:
                        if var_clean.lower() in existing_cols_lower and var_clean not in mapped_vars:
                            # Map the existing column to variable
                            for c in df.columns:
                                if str(c).lower().strip() == var_clean.lower():
                                    current_mapping[str(c)] = var_clean
                                    break
                        continue
                    
                    new_cols_to_add.append(var_clean)
                
                if new_cols_to_add:
                    parser.update_spreadsheet_columns(file_path, new_cols_to_add, campaign=campaign)
                    # We might have updated campaign.spreadsheet_file name inside update_spreadsheet_columns,
                    # so we reload campaign/mapping to make sure we don't overwrite changes
                    campaign.refresh_from_db(fields=["column_mapping"])
                    current_mapping = dict(campaign.column_mapping or {})
                    for col in new_cols_to_add:
                        current_mapping[col] = col
                    
                    campaign.column_mapping = current_mapping
                    campaign.save(update_fields=["column_mapping"])
        except Exception as e:
            logger.error("Error updating local spreadsheet columns for campaign %s: %s", campaign.id, e)

    # 2. Update Google Sheet if sync is enabled
    if campaign.google_sheet_sync_enabled and campaign.google_sheet_id:
        try:
            from apps.campaigns.services.google_sheets import GoogleSheetsService
            sheet_service = GoogleSheetsService()
            
            updated_headers = sheet_service.sync_headers_with_variables(
                user=campaign.user,
                spreadsheet_id=campaign.google_sheet_id,
                variables=variables
            )
            
            campaign.refresh_from_db(fields=["column_mapping"])
            current_mapping = dict(campaign.column_mapping or {})
            
            for h in updated_headers:
                h_clean = h.strip()
                h_norm = h_clean.lower().replace("_", "").replace(" ", "")
                
                if h_clean in current_mapping:
                    continue
                
                matched = False
                for var in variables:
                    var_clean = var.strip()
                    var_norm = var_clean.lower().replace("_", "").replace(" ", "")
                    if h_norm == var_norm:
                        current_mapping[h_clean] = var_clean
                        matched = True
                        break
                
                if not matched:
                    if h_norm == "email":
                        current_mapping[h_clean] = "email"
                    elif h_norm in ["name", "recipientname"]:
                        current_mapping[h_clean] = "recipient_name"
            
            campaign.column_mapping = current_mapping
            campaign.save(update_fields=["column_mapping"])
        except Exception as e:
            logger.error("Error syncing Google Sheet headers for campaign %s: %s", campaign.id, e)

    # 3. Update existing recipient rows in database so they have the new keys in raw_data
    try:
        from apps.recipients.models import RecipientList
        recipients = RecipientList.objects.filter(campaign=campaign)
        if recipients.exists():
            for r in recipients:
                updated_raw = False
                if r.raw_data is None:
                    r.raw_data = {}
                for var in variables:
                    var_clean = var.strip()
                    if var_clean not in r.raw_data:
                        r.raw_data[var_clean] = ""
                        updated_raw = True
                if updated_raw:
                    r.save(update_fields=["raw_data"])
    except Exception as e:
        logger.error("Error updating recipient raw_data keys for campaign %s: %s", campaign.id, e)
