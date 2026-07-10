"""
Google Sheets and Drive service — handles provisioning spreadsheets in Google Drive,
writing header columns, and reading values for campaign synchronization.
"""
import logging
import time
import random
from typing import Any, Optional
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from apps.accounts.services.gmail_oauth import GmailOAuthService

logger = logging.getLogger(__name__)


def retry_on_rate_limit(max_retries=5, initial_backoff=1.0):
    """
    Decorator to retry Google API calls on 403 or 429 Rate Limit errors
    using exponential backoff with jitter.
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            backoff = initial_backoff
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except HttpError as exc:
                    is_rate_limit = False
                    status_code = exc.resp.status
                    if status_code == 429:
                        is_rate_limit = True
                    elif status_code == 403:
                        content = exc.content.decode("utf-8") if isinstance(exc.content, bytes) else str(exc.content)
                        if "rateLimitExceeded" in content or "userRateLimitExceeded" in content:
                            is_rate_limit = True

                    if is_rate_limit and attempt < max_retries - 1:
                        sleep_time = backoff + random.uniform(0, 0.5)
                        logger.warning(
                            "Google API rate limit hit (%s) in %s. Retrying in %.2f seconds (attempt %d/%d)...",
                            status_code, func.__name__, sleep_time, attempt + 1, max_retries
                        )
                        time.sleep(sleep_time)
                        backoff *= 2
                    else:
                        raise exc
        return wrapper
    return decorator


class GoogleSheetsService:
    """Interacts with Google Drive and Google Sheets APIs."""

    def __init__(self):
        self.oauth_service = GmailOAuthService()

    def _get_credentials(self, user) -> Any:
        credentials = self.oauth_service.get_valid_credentials(user)
        if not credentials:
            raise RuntimeError(f"User {user.id} has no valid Google credentials or authentication has expired.")
        return credentials

    @retry_on_rate_limit()
    def create_campaign_sheet(self, user, campaign_name: str, headers: list[str]) -> tuple[str, str]:
        """
        Create a new Google Spreadsheet in the user's Google Drive.
        Writes the headers in the first row.

        Returns:
            Tuple of (spreadsheet_id, web_view_link)
        """
        credentials = self._get_credentials(user)

        # 1. Create the spreadsheet file in Google Drive
        drive_service = build("drive", "v3", credentials=credentials)
        file_metadata = {
            "name": f"Outreach - {campaign_name}",
            "mimeType": "application/vnd.google-apps.spreadsheet",
        }
        
        logger.info("Creating Google Spreadsheet for campaign: %s", campaign_name)
        file = drive_service.files().create(
            body=file_metadata, 
            fields="id,webViewLink"
        ).execute()
        
        spreadsheet_id = file.get("id")
        webview_link = file.get("webViewLink")

        # 2. Write the headers in the first row of the sheet (Range A1)
        sheets_service = build("sheets", "v4", credentials=credentials)
        
        # Clean and format headers (Capitalized for display)
        display_headers = []
        for h in headers:
            h_clean = h.strip().title()
            if h_clean and h_clean not in ["Email", "Name", "Recipient_Name", "Recipient Name"]:
                display_headers.append(h_clean)
        
        # Ensure Email is at index 0, Name is at index 1
        display_headers.insert(0, "Email")
        display_headers.insert(1, "Name")

        body = {
            "values": [display_headers]
        }
        
        logger.info("Writing headers to Google Spreadsheet %s: %s", spreadsheet_id, display_headers)
        sheets_service.spreadsheets().values().update(
            spreadsheetId=spreadsheet_id,
            range="A1",
            valueInputOption="RAW",
            body=body
        ).execute()

        return spreadsheet_id, webview_link

    @retry_on_rate_limit()
    def fetch_sheet_rows(self, user, spreadsheet_id: str, column_mapping: dict = None) -> list[dict[str, str]]:
        """
        Fetch all values from a Google Spreadsheet, mapping headers to cell values.

        Returns:
            List of dicts representing rows, keyed by lowercase header names.
        """
        credentials = self._get_credentials(user)
        sheets_service = build("sheets", "v4", credentials=credentials)

        logger.info("Fetching values from Google Spreadsheet %s", spreadsheet_id)
        result = sheets_service.spreadsheets().values().get(
            spreadsheetId=spreadsheet_id,
            range="A1:Z1000"
        ).execute()

        values = result.get("values", [])
        if not values:
            return []

        # Parse headers (row 0)
        raw_headers = values[0]
        
        # Build normalized lookup for column_mapping if provided
        mapping_lookup = {}
        if column_mapping:
            for display_header, var_name in column_mapping.items():
                norm_key = str(display_header).strip().lower().replace("_", "").replace(" ", "")
                mapping_lookup[norm_key] = var_name

        headers = []
        for h in raw_headers:
            h_str = str(h).strip()
            norm_h = h_str.lower().replace("_", "").replace(" ", "")
            
            # Map using column_mapping if there is a match
            if norm_h in mapping_lookup:
                h_clean = mapping_lookup[norm_h]
            else:
                # Fallback clean mapping
                h_clean = h_str.lower()
                if h_clean == "name":
                    h_clean = "recipient_name"
                elif h_clean == "email":
                    h_clean = "email"
            headers.append(h_clean)

        # Parse data rows (row 1 onwards)
        rows = []
        for row_vals in values[1:]:
            row_dict = {}
            # Ensure row is not completely empty
            if not any(row_vals):
                continue
            for idx, header in enumerate(headers):
                if idx < len(row_vals):
                    row_dict[header] = str(row_vals[idx]).strip()
                else:
                    row_dict[header] = ""
            rows.append(row_dict)

        return rows

    @retry_on_rate_limit()
    def update_sheet_rows(
        self, 
        user, 
        spreadsheet_id: str, 
        headers: list[str], 
        rows: list[dict], 
        column_mapping: dict = None
    ) -> None:
        """
        Overwrite Google Sheet rows (starting from row 2) with the provided recipients.
        Keeps headers in row 1 intact, clears everything below, and writes the new data.
        """
        credentials = self._get_credentials(user)
        sheets_service = build("sheets", "v4", credentials=credentials)

        # 1. Fetch current header row from the Google Sheet (row 1)
        logger.info("Fetching headers from Google Spreadsheet %s to align columns", spreadsheet_id)
        try:
            result = sheets_service.spreadsheets().values().get(
                spreadsheetId=spreadsheet_id,
                range="A1:Z1"
            ).execute()
            sheet_headers = result.get("values", [[]])[0]
        except Exception as exc:
            logger.warning("Could not fetch Google Sheet headers: %s. Falling back to passed headers.", exc)
            sheet_headers = []

        if not sheet_headers:
            sheet_headers = headers

        # 2. Clear existing data in A2:Z1000
        logger.info("Clearing Google Spreadsheet %s data range A2:Z1000", spreadsheet_id)
        sheets_service.spreadsheets().values().clear(
            spreadsheetId=spreadsheet_id,
            range="A2:Z1000",
            body={}
        ).execute()

        if not rows:
            return

        # Build lookup for column_mapping
        mapping_lookup = {}
        if column_mapping:
            for display_header, var_name in column_mapping.items():
                norm_key = str(display_header).strip().lower().replace("_", "").replace(" ", "")
                mapping_lookup[norm_key] = var_name

        # 3. Build values array aligned with the sheet's header columns
        header_keys = []
        for h in sheet_headers:
            h_str = str(h).strip()
            norm_h = h_str.lower().replace("_", "").replace(" ", "")
            
            # Map standard columns or use column_mapping lookup
            if norm_h in mapping_lookup:
                h_clean = mapping_lookup[norm_h]
            else:
                h_clean = h_str.lower()
                if h_clean == "name":
                    h_clean = "recipient_name"
                elif h_clean == "email":
                    h_clean = "email"
            header_keys.append(h_clean)

        values = []
        for row in rows:
            row_vals = []
            for key in header_keys:
                val = row.get(key)
                if val is None:
                    # Fallback mapping
                    if key == "recipient_name":
                        val = row.get("name") or row.get("recipient_name")
                    elif key == "email":
                        val = row.get("email") or row.get("recipient_email")
                    else:
                        # Case-insensitive and underscore-insensitive matching with row keys
                        normalized_key = key.replace("_", "").replace(" ", "").lower()
                        for rk, rv in row.items():
                            if rk.replace("_", "").replace(" ", "").lower() == normalized_key:
                                val = rv
                                break
                row_vals.append(str(val).strip() if val is not None else "")
            values.append(row_vals)

        body = {
            "values": values
        }

        logger.info("Writing %d rows to Google Spreadsheet %s", len(rows), spreadsheet_id)
        sheets_service.spreadsheets().values().update(
            spreadsheetId=spreadsheet_id,
            range="A2",
            body=body,
            valueInputOption="RAW"
        ).execute()

    @retry_on_rate_limit()
    def sync_headers_with_variables(self, user, spreadsheet_id: str, variables: list[str]) -> list[str]:
        """
        Fetch the current headers in row 1, compare with variables,
        and append any missing variables to the headers row in the Google Sheet.
        Returns the updated headers list.
        """
        credentials = self._get_credentials(user)
        sheets_service = build("sheets", "v4", credentials=credentials)

        # 1. Fetch current header row (A1:Z1)
        result = sheets_service.spreadsheets().values().get(
            spreadsheetId=spreadsheet_id,
            range="A1:Z1"
        ).execute()
        sheet_headers = result.get("values", [[]])[0]

        # If headers are completely empty, start with default "Email" and "Name"
        if not sheet_headers:
            sheet_headers = ["Email", "Name"]

        # Normalize existing headers for comparison
        existing_norm = [str(h).strip().lower().replace("_", "").replace(" ", "") for h in sheet_headers]

        updated = False
        new_headers = list(sheet_headers)
        for var in variables:
            var_clean = var.strip()
            # Skip email/name as they are already standard
            if var_clean.lower() in ["email", "name", "recipient_email", "recipient_name"]:
                continue
            var_norm = var_clean.lower().replace("_", "").replace(" ", "")
            if var_norm not in existing_norm:
                # We title case display headers in Google Sheets
                new_headers.append(var_clean.title())
                updated = True

        if updated:
            body = {
                "values": [new_headers]
            }
            sheets_service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range="A1",
                valueInputOption="RAW",
                body=body
            ).execute()

        return new_headers

