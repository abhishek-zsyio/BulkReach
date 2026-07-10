"""
Attachment handler service — handles PDF resume attachment for emails.
"""
import logging
import os
from email.mime.application import MIMEApplication

logger = logging.getLogger(__name__)

MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


class AttachmentHandler:
    """Handles PDF file validation and attachment for outgoing emails."""

    def validate_pdf(self, file_path: str) -> None:
        """
        Validate that a file exists, is readable, is a PDF, and is within size limits.

        Raises:
            ValueError: If validation fails.
        """
        if not file_path or not os.path.exists(file_path):
            raise ValueError(f"Attachment file not found: {file_path}")

        size = os.path.getsize(file_path)
        if size > MAX_ATTACHMENT_SIZE_BYTES:
            raise ValueError(
                f"Attachment size ({size / 1024 / 1024:.1f} MB) exceeds 5 MB limit."
            )

        with open(file_path, "rb") as f:
            header = f.read(4)
            if header != b"%PDF":
                raise ValueError("Attachment is not a valid PDF file.")

    def build_attachment_part(self, file_path: str) -> MIMEApplication:
        """
        Build a MIMEApplication part for attaching a PDF to an email.

        Args:
            file_path: Absolute path to the PDF file.

        Returns:
            MIMEApplication object ready to attach to a MIMEMultipart message.
        """
        filename = os.path.basename(file_path)
        with open(file_path, "rb") as f:
            content = f.read()

        part = MIMEApplication(content, _subtype="pdf")
        part.add_header("Content-Disposition", "attachment", filename=filename)
        return part
