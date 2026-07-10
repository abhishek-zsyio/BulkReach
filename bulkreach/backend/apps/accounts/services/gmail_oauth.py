"""
Gmail OAuth2 service — handles authorization URL generation, token exchange,
token refresh, and stores/retrieves encrypted credentials from UserProfile.
"""
import os
import logging
import hashlib
import base64

os.environ["OAUTHLIB_RELAX_TOKEN_SCOPE"] = "1"
from datetime import datetime, timezone
from typing import Optional

from django.conf import settings
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.auth.transport.requests import Request

logger = logging.getLogger(__name__)

SCOPES = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/spreadsheets",
    "openid",
]


class GmailOAuthService:
    """Encapsulates Gmail OAuth2 token lifecycle."""

    def _get_flow(self) -> Flow:
        client_config = {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uris": [settings.GOOGLE_REDIRECT_URI],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        }
        flow = Flow.from_client_config(client_config, scopes=SCOPES)
        flow.redirect_uri = settings.GOOGLE_REDIRECT_URI
        return flow

    def _get_code_verifier(self, user_id: int) -> str:
        """Generate a cryptographically secure, deterministic PKCE verifier for local/stateless callback."""
        seed = f"{user_id}-{settings.SECRET_KEY}"
        # SHA256 returns 32 bytes, which maps to a valid 43-character URL-safe base64 string
        return base64.urlsafe_b64encode(hashlib.sha256(seed.encode()).digest()).decode().rstrip("=")

    def get_authorization_url(self, user_id: int, state_val: Optional[str] = None) -> str:
        """Generate the Google OAuth2 consent screen URL, encoding state_val (or user_id) as state."""
        flow = self._get_flow()
        # Set deterministic code verifier for PKCE
        flow.code_verifier = self._get_code_verifier(user_id)
        auth_url, _ = flow.authorization_url(
            access_type="offline",
            include_granted_scopes="true",
            prompt="consent",
            state=state_val or str(user_id),
        )
        return auth_url

    def exchange_code_for_tokens(self, code: str, state: str):
        """
        Exchange auth code for access+refresh tokens.
        Stores encrypted tokens on the UserProfile and returns the updated user.
        """
        from apps.accounts.models import UserProfile  # avoid circular import

        user_id = int(state)
        flow = self._get_flow()
        # Re-compute and set the identical code verifier
        code_verifier = self._get_code_verifier(user_id)
        flow.code_verifier = code_verifier
        flow.fetch_token(code=code, code_verifier=code_verifier)
        credentials = flow.credentials
        
        user = UserProfile.objects.get(pk=user_id)

        # Fetch sender email from Google OAuth2 profile info
        service = build("oauth2", "v2", credentials=credentials)
        profile = service.userinfo().get().execute()
        sender_email = profile.get("email", "")

        # Store tokens (encrypted by django-encrypted-model-fields)
        user.gmail_access_token = credentials.token
        user.gmail_refresh_token = credentials.refresh_token
        user.gmail_token_expiry = credentials.expiry
        user.gmail_connected = True
        user.sender_email = sender_email
        if not user.sender_name:
            user.sender_name = sender_email.split("@")[0].replace(".", " ").title()
        user.save(update_fields=[
            "gmail_access_token", "gmail_refresh_token", "gmail_token_expiry",
            "gmail_connected", "sender_email", "sender_name",
        ])
        logger.info("Gmail tokens stored for user %s", user_id)
        return user

    def login_or_register_via_google(self, code: str, state: str):
        """
        Exchanges code for tokens, retrieves user email from Google Userinfo API,
        finds or creates a UserProfile, stores the Google credentials,
        and returns simple JWT tokens for the user.
        """
        from apps.accounts.models import UserProfile
        from rest_framework_simplejwt.tokens import RefreshToken

        # Parse random string from state (e.g. login_randomstring)
        random_string = state.split("_", 1)[1] if "_" in state else state

        flow = self._get_flow()
        # Re-compute deterministic code verifier for login
        seed = f"login-{random_string}-{settings.SECRET_KEY}"
        code_verifier = base64.urlsafe_b64encode(hashlib.sha256(seed.encode()).digest()).decode().rstrip("=")
        flow.code_verifier = code_verifier

        flow.fetch_token(code=code, code_verifier=code_verifier)
        credentials = flow.credentials

        # Fetch profile
        service = build("oauth2", "v2", credentials=credentials)
        profile = service.userinfo().get().execute()
        email = profile.get("email", "").strip().lower()
        if not email:
            raise ValueError("Google OAuth response did not contain an email address.")

        # Find or create user
        try:
            user = UserProfile.objects.get(email=email)
        except UserProfile.DoesNotExist:
            # Check if username exists (e.g. username is same as email)
            try:
                user = UserProfile.objects.get(username=email)
            except UserProfile.DoesNotExist:
                # Create user
                first_name = profile.get("given_name", "")
                last_name = profile.get("family_name", "")
                user = UserProfile(
                    username=email,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                )
                user.set_unusable_password()
                user.save()

        # Update Google OAuth tokens
        user.gmail_access_token = credentials.token
        user.gmail_refresh_token = credentials.refresh_token
        user.gmail_token_expiry = credentials.expiry
        user.gmail_connected = True
        user.sender_email = email
        if not user.sender_name:
            user.sender_name = f"{user.first_name} {user.last_name}".strip() or email.split("@")[0].replace(".", " ").title()
        user.save(update_fields=[
            "gmail_access_token", "gmail_refresh_token", "gmail_token_expiry",
            "gmail_connected", "sender_email", "sender_name",
        ])

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        tokens = {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }

        return user, tokens

    def get_valid_credentials(self, user) -> Optional[Credentials]:
        """
        Retrieve credentials for a user, refreshing the access token if expired.
        Returns None if the user has no OAuth tokens.
        """
        if not user.has_gmail_oauth:
            return None

        expiry = user.gmail_token_expiry
        if expiry and expiry.tzinfo is not None:
            expiry = expiry.astimezone(timezone.utc).replace(tzinfo=None)

        credentials = Credentials(
            token=user.gmail_access_token,
            refresh_token=user.gmail_refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
            scopes=SCOPES,
            expiry=expiry,
        )

        # Refresh if expired
        if credentials.expired and credentials.refresh_token:
            try:
                credentials.refresh(Request())
                # Persist refreshed token (NEVER log the token value)
                user.gmail_access_token = credentials.token
                user.gmail_token_expiry = credentials.expiry
                user.save(update_fields=["gmail_access_token", "gmail_token_expiry"])
                logger.info("Gmail token refreshed for user %s", user.id)
            except Exception as exc:
                logger.error("Failed to refresh Gmail token for user %s: %s", user.id, type(exc).__name__)
                return None

        return credentials
