"""
Email sender service — Gmail API (preferred) with SMTP fallback.
Tokens are NEVER logged. All token access goes through GmailOAuthService.

Deliverability notes
--------------------
* plain_text_mode=True  → sends *only* a plain-text part; no HTML, no tracking pixel.
  Best for cold job-application outreach (inbox over Promotions/Spam).
* plain_text_mode=False → sends multipart/alternative (plain + HTML).
  MIME type is "alternative" when no attachment is present, "mixed" only when a
  PDF is attached — matching RFC 2046 conventions.
* open_tracking_enabled is silently ignored when plain_text_mode=True.
"""
import logging
import smtplib
import base64
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from typing import Optional

from django.conf import settings
from django.utils.html import strip_tags
from googleapiclient.discovery import build

from apps.accounts.services.gmail_oauth import GmailOAuthService

logger = logging.getLogger(__name__)


class EmailSender:
    """
    Abstraction over Gmail API and SMTP.
    Prefer Gmail API when OAuth credentials are available; fall back to SMTP.
    """

    def __init__(self, user):
        self.user = user
        self._oauth_service = GmailOAuthService()

    # ------------------------------------------------------------------
    # HTML helpers
    # ------------------------------------------------------------------

    def wrap_in_base_theme(self, html_body: str) -> str:
        """Wrap the email HTML body in a clean, minimal envelope for high deliverability."""
        return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }}
    .email-text {{
      font-size: 14px;
      line-height: 1.6;
      color: #333333;
    }}
    .email-text p {{
      margin-top: 0;
      margin-bottom: 16px;
    }}
    .email-text strong {{
      font-weight: 600;
    }}
    .email-text a {{
      color: #000000;
      text-decoration: underline;
    }}
    .email-text h2 {{
      font-size: 18px;
      font-weight: 600;
      margin-top: 24px;
      margin-bottom: 12px;
    }}
    .email-text ul, .email-text ol {{
      margin-top: 0;
      margin-bottom: 16px;
      padding-left: 20px;
    }}
    .email-text li {{
      margin-bottom: 8px;
    }}
    .email-text code {{
      background-color: #f4f4f5;
      padding: 2px 4px;
      border-radius: 4px;
      font-family: ui-monospace, SFMono-Regular, monospace;
      font-size: 13px;
    }}
    @media (prefers-color-scheme: dark) {{
      body {{ background-color: #000000 !important; }}
      .email-text {{ color: #cccccc !important; }}
      .email-text strong, .email-text a, .email-text h2 {{ color: #ffffff !important; }}
      .email-text code {{ background-color: #18181b !important; color: #fafafa !important; }}
    }}
  </style>
</head>
<body>
  <div class="email-text">
    {html_body}
  </div>
</body>
</html>"""

    # ------------------------------------------------------------------
    # MIME construction
    # ------------------------------------------------------------------

    def _sender_header(self) -> str:
        return f"{self.user.sender_name} <{self.user.sender_email or settings.EMAIL_HOST_USER}>"

    def build_plain_text_message(
        self,
        to: str,
        subject: str,
        html_body: str,
        attachment_path: Optional[str] = None,
    ) -> MIMEMultipart:
        """
        Build a plain-text-only MIME message (no HTML part, no tracking).

        The html_body is stripped of all tags so the user can still author
        content in the rich editor — it's just delivered as plain text.
        """
        has_attachment = bool(attachment_path)

        if has_attachment:
            msg = MIMEMultipart("mixed")
            msg["To"] = to
            msg["From"] = self._sender_header()
            msg["Subject"] = subject
            msg.attach(MIMEText(strip_tags(html_body), "plain", "utf-8"))
        else:
            # A plain MIMEText is the most deliverable format possible.
            # Wrap it in a thin MIMEMultipart only so we can set headers cleanly.
            msg = MIMEMultipart("mixed")
            msg["To"] = to
            msg["From"] = self._sender_header()
            msg["Subject"] = subject
            msg.attach(MIMEText(strip_tags(html_body), "plain", "utf-8"))

        if has_attachment:
            self._maybe_attach_pdf(msg, attachment_path, to)

        return msg

    def build_mime_message(
        self,
        to: str,
        subject: str,
        html_body: str,
        attachment_path: Optional[str] = None,
        tracking_pixel_html: Optional[str] = None,
    ) -> MIMEMultipart:
        """
        Construct a multipart/alternative (plain + HTML) MIME message.

        MIME structure:
          - No attachment  → multipart/alternative  [plain, html]
          - With attachment → multipart/mixed
                               └─ multipart/alternative [plain, html]
                               └─ application/pdf
        """
        has_attachment = bool(attachment_path)

        # Inject optional tracking pixel into HTML body
        final_html = html_body
        if tracking_pixel_html:
            if "</body>" in final_html:
                final_html = final_html.replace("</body>", f"{tracking_pixel_html}</body>")
            else:
                final_html = f"{final_html}{tracking_pixel_html}"

        # Build the alternative part (plain + HTML)
        alt_part = MIMEMultipart("alternative")
        alt_part.attach(MIMEText(strip_tags(html_body), "plain", "utf-8"))
        alt_part.attach(MIMEText(self.wrap_in_base_theme(final_html), "html", "utf-8"))

        if has_attachment:
            # Outer container must be "mixed" to hold alt + attachment
            msg = MIMEMultipart("mixed")
            msg["To"] = to
            msg["From"] = self._sender_header()
            msg["Subject"] = subject
            msg.attach(alt_part)
            self._maybe_attach_pdf(msg, attachment_path, to)
        else:
            # No attachment — alt_part IS the message; promote headers onto it
            msg = alt_part
            msg["To"] = to
            msg["From"] = self._sender_header()
            msg["Subject"] = subject

        return msg

    def _maybe_attach_pdf(self, msg: MIMEMultipart, attachment_path: str, to: str) -> None:
        """Validate and attach a PDF to an existing MIME message."""
        from apps.campaigns.services.attachment_handler import AttachmentHandler
        handler = AttachmentHandler()
        try:
            handler.validate_pdf(attachment_path)
            pdf_part = handler.build_attachment_part(attachment_path)
            msg.attach(pdf_part)
        except ValueError as exc:
            logger.warning("Attachment skipped for %s: %s", to, exc)

    # ------------------------------------------------------------------
    # Public send interface
    # ------------------------------------------------------------------

    def send(
        self,
        to: str,
        subject: str,
        html_body: str,
        attachment_path: Optional[str] = None,
        plain_text_mode: bool = False,
        tracking_pixel_html: Optional[str] = None,
    ) -> str:
        """
        Send an email. Uses Gmail API if OAuth credentials are available,
        otherwise falls back to SMTP.

        Args:
            to:                 Recipient email address.
            subject:            Email subject line (already rendered).
            html_body:          HTML body (already rendered by TemplateRenderer).
            attachment_path:    Optional path to a PDF attachment.
            plain_text_mode:    When True, strip HTML and send plain-text only.
                                Overrides tracking_pixel_html (pixel is never injected).
            tracking_pixel_html: Pre-built <img> tracking pixel snippet, or None.

        Returns:
            Gmail message_id string on success.

        Raises:
            Exception on send failure.
        """
        if plain_text_mode:
            msg = self.build_plain_text_message(to, subject, html_body, attachment_path)
        else:
            msg = self.build_mime_message(
                to, subject, html_body, attachment_path,
                tracking_pixel_html=tracking_pixel_html,
            )

        credentials = self._oauth_service.get_valid_credentials(self.user)

        if credentials:
            return self._send_via_gmail_api(credentials, msg)
        else:
            return self._send_via_smtp(msg, to)

    # ------------------------------------------------------------------
    # Transport layer
    # ------------------------------------------------------------------

    def _send_via_gmail_api(self, credentials, msg) -> str:
        """Send via Gmail API using OAuth2 credentials."""
        service = build("gmail", "v1", credentials=credentials)
        raw = base64.urlsafe_b64encode(msg.as_bytes()).decode("utf-8")
        result = service.users().messages().send(
            userId="me", body={"raw": raw}
        ).execute()
        message_id = result.get("id", "")
        logger.info("Email sent via Gmail API → message_id: %s", message_id)
        return message_id

    def _send_via_smtp(self, msg, to: str) -> str:
        """Send via SMTP as a fallback when no OAuth token is present."""
        host = settings.EMAIL_HOST
        port = settings.EMAIL_PORT
        username = settings.EMAIL_HOST_USER
        password = settings.EMAIL_HOST_PASSWORD

        if not username or not password:
            raise RuntimeError(
                "No Gmail OAuth token and no SMTP credentials configured. Cannot send email."
            )

        if not msg.get("From"):
            msg["From"] = username

        with smtplib.SMTP(host, port, timeout=30) as server:
            server.ehlo()
            server.starttls()
            server.login(username, password)
            server.sendmail(username, [to], msg.as_string())

        logger.info("Email sent via SMTP to %s", to)
        return f"smtp-{to}"
