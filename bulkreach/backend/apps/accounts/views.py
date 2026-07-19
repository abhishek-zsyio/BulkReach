"""Accounts app — API views."""
import logging
import requests
from django.conf import settings
from django.shortcuts import redirect
from rest_framework import status, viewsets, parsers
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken

from .models import UserProfile, UserResume, AIUsageLog, log_ai_usage
from .serializers import RegisterSerializer, UserProfileSerializer, CustomTokenObtainPairSerializer, UserResumeSerializer
from .services.gmail_oauth import GmailOAuthService

logger = logging.getLogger(__name__)


class RegisterView(APIView):
    """POST /api/auth/register/ — create a new user account."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "message": "Account created successfully.",
                "user": UserProfileSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class CustomTokenObtainPairView(TokenObtainPairView):
    """POST /api/auth/login/ — returns JWT access + refresh tokens with user data."""

    permission_classes = [AllowAny]
    serializer_class = CustomTokenObtainPairSerializer


class MeView(APIView):
    """GET /api/auth/me/ — returns current authenticated user profile."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserProfileSerializer(request.user).data)

    def patch(self, request):
        data = request.data.copy() if hasattr(request.data, "copy") else dict(request.data)
        
        resume_pdf = request.FILES.get("resume_pdf")
        if resume_pdf:
            import fitz
            try:
                resume_pdf.seek(0)
                doc = fitz.open(stream=resume_pdf.read(), filetype="pdf")
                text = ""
                for page in doc:
                    text += page.get_text()
                data["resume_text"] = text.strip()
            except Exception as e:
                logger.error("Failed to parse PDF: %s", e)
                return Response(
                    {"error": True, "message": "Failed to parse PDF file. Please ensure it is a valid PDF."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        serializer = UserProfileSerializer(request.user, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request):
        user = request.user
        token = user.gmail_refresh_token or user.gmail_access_token
        if token:
            try:
                requests.post("https://oauth2.googleapis.com/revoke", data={"token": token}, timeout=5)
            except Exception as exc:
                logger.warning("Failed to revoke Google token during user deletion: %s", exc)
        user.delete()
        return Response({"message": "Account deleted successfully."}, status=status.HTTP_204_NO_CONTENT)


class AIStatusView(APIView):
    """GET /api/auth/ai-status/ — returns Gemini API key status and usage info."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.utils import timezone
        
        user = request.user
        has_key = bool(user.gemini_api_key)
        model = user.gemini_model or "gemini-2.5-flash"
        
        # Calculate daily usage starting from midnight UTC
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        requests_today = AIUsageLog.objects.filter(user=user, timestamp__gte=today_start).count()
        
        # Retrieve recent logs
        logs = AIUsageLog.objects.filter(user=user)[:5]
        recent_logs = []
        for log in logs:
            recent_logs.append({
                "id": log.id,
                "request_type": log.request_type,
                "model_name": log.model_name,
                "timestamp": log.timestamp.isoformat(),
            })

        return Response({
            "has_key": has_key,
            "model": model,
            "requests_today": requests_today,
            "daily_limit": 1500,
            "recent_logs": recent_logs,
        })



class GmailConnectView(APIView):
    """GET /api/auth/gmail/connect/ — redirect user to Google OAuth2 consent screen."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        redirect_to = request.query_params.get("redirect_to", "dashboard")
        frontend_origin = request.query_params.get("origin", settings.FRONTEND_URL)
        
        import base64
        encoded_origin = base64.urlsafe_b64encode(frontend_origin.encode()).decode().rstrip("=")
        
        oauth_service = GmailOAuthService()
        state_str = f"{request.user.id}:{redirect_to}:{encoded_origin}"
        auth_url = oauth_service.get_authorization_url(user_id=request.user.id, state_val=state_str)
        return Response({"auth_url": auth_url})


class GmailConnectConfirmView(APIView):
    """POST /api/auth/gmail/connect/confirm/ — secure, authenticated exchange of code for Google tokens."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        code = request.data.get("code")
        state = request.data.get("state")

        if not code:
            return Response(
                {"error": True, "message": "Missing authorization code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate state is valid and contains user_id matching current request.user.id
        if state:
            try:
                user_id_str = state.split(":", 1)[0] if ":" in state else state
                if int(user_id_str) != request.user.id:
                    return Response(
                        {"error": True, "message": "Invalid state (user mismatch)."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            except ValueError:
                return Response(
                    {"error": True, "message": "Invalid state format."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        oauth_service = GmailOAuthService()
        try:
            user = oauth_service.exchange_code_for_tokens(code=code, state=str(request.user.id))
            return Response(UserProfileSerializer(user).data)
        except Exception as exc:
            logger.exception("Failed to connect Gmail account: %s", exc)
            return Response(
                {"error": True, "message": f"Gmail connection failed: {exc}"},
                status=status.HTTP_400_BAD_REQUEST,
            )


from django.http import HttpResponse

class GmailCallbackView(APIView):
    """GET /api/auth/gmail/callback/ — handle OAuth2 callback for both login and connect flows."""

    permission_classes = [AllowAny]

    def get(self, request):
        code = request.query_params.get("code")
        state = request.query_params.get("state")

        if not code:
            err_url = f"{settings.FRONTEND_URL.rstrip('/')}/google-callback?error=missing_code"
            return redirect(err_url)

        oauth_service = GmailOAuthService()
        try:
            if state and state.startswith("login_"):
                # Handle Google Login / Register
                # Extract origin if present
                actual_state = state
                frontend_url = settings.FRONTEND_URL
                if ":" in state:
                    actual_state, encoded_origin = state.split(":", 1)
                    try:
                        import base64
                        padded = encoded_origin + "=" * (4 - len(encoded_origin) % 4)
                        frontend_url = base64.urlsafe_b64decode(padded.encode()).decode()
                    except Exception:
                        logger.warning("Failed to decode origin from state: %s", encoded_origin)

                user, tokens = oauth_service.login_or_register_via_google(code=code, state=actual_state)
                # Store the tokens directly in the cache for desktop sync!
                DESKTOP_LOGIN_CACHE[actual_state] = {"access": tokens['access'], "refresh": tokens['refresh']}
                
                frontend_cb_url = f"{frontend_url.rstrip('/')}/google-callback?access={tokens['access']}&refresh={tokens['refresh']}&state={actual_state}"
                return redirect(frontend_cb_url)
            else:
                # Handle Connect Gmail Flow directly on the backend
                user_id_str = state
                redirect_to = "dashboard"
                frontend_url = settings.FRONTEND_URL
                
                if state and ":" in state:
                    parts = state.split(":")
                    user_id_str = parts[0]
                    if len(parts) > 1:
                        redirect_to = parts[1]
                    if len(parts) > 2:
                        try:
                            import base64
                            encoded_origin = parts[2]
                            padded = encoded_origin + "=" * (4 - len(encoded_origin) % 4)
                            frontend_url = base64.urlsafe_b64decode(padded.encode()).decode()
                        except Exception:
                            logger.warning("Failed to decode origin from connect state: %s", parts[2])

                try:
                    # Exchange the code for tokens and save them directly in the DB
                    oauth_service.exchange_code_for_tokens(code=code, state=user_id_str)
                except Exception as exc:
                    logger.exception("Failed to connect Gmail on backend callback: %s", exc)
                    raise exc

                frontend_cb_url = f"{frontend_url.rstrip('/')}/google-callback?gmail_connected=success&state={user_id_str}:{redirect_to}"
                return redirect(frontend_cb_url)
        except Exception as exc:
            logger.exception("Gmail OAuth callback error: %s", exc)
            err_url = f"{settings.FRONTEND_URL.rstrip('/')}/google-callback?error=auth_failed"
            return redirect(err_url)


class GmailDisconnectView(APIView):
    """POST /api/auth/gmail/disconnect/ — revoke Gmail tokens."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        token = user.gmail_refresh_token or user.gmail_access_token
        if token:
            try:
                requests.post("https://oauth2.googleapis.com/revoke", data={"token": token}, timeout=5)
            except Exception as exc:
                logger.warning("Failed to revoke Google token during disconnect: %s", exc)

        user.gmail_access_token = None
        user.gmail_refresh_token = None
        user.gmail_token_expiry = None
        user.gmail_connected = False
        user.sender_email = ""
        user.save(update_fields=[
            "gmail_access_token", "gmail_refresh_token",
            "gmail_token_expiry", "gmail_connected", "sender_email",
        ])
        return Response({"message": "Gmail disconnected and Google tokens revoked."})


class GoogleLoginUrlView(APIView):
    """GET /api/auth/google/login-url/ — returns Google login/registration URL."""

    permission_classes = [AllowAny]

    def get(self, request):
        import uuid
        import base64
        import hashlib
        oauth_service = GmailOAuthService()
        
        frontend_origin = request.query_params.get("origin", settings.FRONTEND_URL)
        
        # Generate a random state string for PKCE determinism
        random_state = uuid.uuid4().hex
        
        flow = oauth_service._get_flow()
        # Set deterministic code verifier for login
        seed = f"login-{random_state}-{settings.SECRET_KEY}"
        flow.code_verifier = base64.urlsafe_b64encode(hashlib.sha256(seed.encode()).digest()).decode().rstrip("=")
        
        encoded_origin = base64.urlsafe_b64encode(frontend_origin.encode()).decode().rstrip("=")
        
        auth_url, _ = flow.authorization_url(
            access_type="offline",
            include_granted_scopes="true",
            prompt="consent",
            state=f"login_{random_state}:{encoded_origin}",
        )
        return Response({"auth_url": auth_url})


# Temporary in-memory cache for syncing desktop login tokens
DESKTOP_LOGIN_CACHE = {}

class DesktopLoginStoreView(APIView):
    """POST /api/auth/desktop-login/ — temporarily store access/refresh tokens for desktop sync."""
    permission_classes = [AllowAny]

    def post(self, request):
        state = request.data.get("state")
        access = request.data.get("access")
        refresh = request.data.get("refresh")
        if state:
            if ":" in state:
                state = state.split(":", 1)[0]
            if access and refresh:
                DESKTOP_LOGIN_CACHE[state] = {"access": access, "refresh": refresh}
                return Response({"status": "stored"})
        return Response({"error": "invalid_data"}, status=400)


class DesktopLoginStatusView(APIView):
    """GET /api/auth/desktop-login/status/ — poll login tokens for a specific state."""
    permission_classes = [AllowAny]

    def get(self, request):
        state = request.query_params.get("state")
        if state:
            if ":" in state:
                state = state.split(":", 1)[0]
            if state in DESKTOP_LOGIN_CACHE:
                tokens = DESKTOP_LOGIN_CACHE.pop(state)
                return Response(tokens)
        return Response({"status": "pending"})


class SafeTokenRefreshView(TokenRefreshView):
    """
    POST /api/auth/token/refresh/ — wraps simplejwt's TokenRefreshView.

    If the refresh token references a user that no longer exists in the DB
    (e.g. after a DB reset), simplejwt raises UserProfile.DoesNotExist which
    propagates as a 500.  We catch it here and return a clean 401 so the
    frontend can redirect to login gracefully.
    """

    def post(self, request, *args, **kwargs):
        try:
            return super().post(request, *args, **kwargs)
        except Exception as exc:
            # Catch stale-token / deleted-user errors and surface them as 401
            exc_name = type(exc).__name__
            if "DoesNotExist" in exc_name or "UserProfile" in str(exc):
                logger.warning(
                    "Token refresh failed — user referenced by token no longer exists: %s", exc
                )
                raise InvalidToken({"detail": "User account not found. Please log in again."})
            raise


class LogoutView(APIView):
    """POST /api/auth/logout/ — log out user."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        # We keep the Gmail OAuth integration persistent on logout
        return Response({"message": "Logged out successfully."})

class UserResumeViewSet(viewsets.ModelViewSet):
    """ViewSet for managing user resumes."""
    permission_classes = [IsAuthenticated]
    serializer_class = UserResumeSerializer
    pagination_class = None
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_queryset(self):
        user = self.request.user
        return UserResume.objects.filter(user=user)

    def perform_create(self, serializer):
        user = self.request.user
        is_first = not UserResume.objects.filter(user=user).exists()
        resume = serializer.save(user=user)
        if is_first:
            resume.is_default = True
            resume.save(update_fields=["is_default"])
        # Parse PDF text
        if resume.file:
            import fitz
            from .services.resume_parser import parse_resume_text_with_gemini, parse_resume_text_locally
            try:
                resume.file.seek(0)
                doc = fitz.open(stream=resume.file.read(), filetype="pdf")
                text = ""
                for page in doc:
                    text += page.get_text()
                resume.parsed_text = text.strip()
                
                gemini_api_key = getattr(user, "gemini_api_key", "")
                if gemini_api_key:
                    try:
                        resume.structured_data = parse_resume_text_with_gemini(
                            resume.parsed_text,
                            gemini_api_key,
                            model=getattr(user, "gemini_model", "gemini-2.5-flash") or "gemini-2.5-flash"
                        )
                        log_ai_usage(user, "Resume Parsing", model_name=getattr(user, "gemini_model", "gemini-2.5-flash") or "gemini-2.5-flash")
                    except Exception as ge:
                        logger.warning("Gemini parsing failed, using local fallback: %s", ge)
                
                # Local fallback if Gemini fails or key not configured
                if not resume.structured_data:
                    resume.structured_data = parse_resume_text_locally(resume.parsed_text)
                    
                resume.save(update_fields=["parsed_text", "structured_data"])
            except Exception as e:
                logger.error("Failed to parse PDF for UserResume %s: %s", resume.id, e)
        elif resume.structured_data:
            from .services.resume_parser import compile_structured_data_to_text
            resume.parsed_text = compile_structured_data_to_text(resume.structured_data)
            resume.save(update_fields=["parsed_text"])

    def perform_update(self, serializer):
        resume = serializer.save()
        if resume.structured_data:
            from .services.resume_parser import compile_structured_data_to_text
            resume.parsed_text = compile_structured_data_to_text(resume.structured_data)
            resume.save(update_fields=["parsed_text"])

    @action(detail=True, methods=["POST"])
    def parse(self, request, pk=None):
        """Re-runs the parser using Gemini (preferred) or local fallback on the existing parsed_text."""
        resume = self.get_object()
        user = request.user
        from .services.resume_parser import parse_resume_text_with_gemini, parse_resume_text_locally
        
        if not resume.parsed_text and resume.file:
            import fitz
            try:
                resume.file.seek(0)
                doc = fitz.open(stream=resume.file.read(), filetype="pdf")
                text = ""
                for page in doc:
                    text += page.get_text()
                resume.parsed_text = text.strip()
            except Exception as e:
                return Response({"error": f"Failed to extract text from PDF: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
        
        gemini_api_key = getattr(user, "gemini_api_key", "")
        if gemini_api_key:
            try:
                resume.structured_data = parse_resume_text_with_gemini(
                    resume.parsed_text or "",
                    gemini_api_key,
                    model=getattr(user, "gemini_model", "gemini-2.5-flash") or "gemini-2.5-flash"
                )
                log_ai_usage(user, "Resume Parsing (Re-parse)", model_name=getattr(user, "gemini_model", "gemini-2.5-flash") or "gemini-2.5-flash")
            except Exception as ge:
                logger.warning("Gemini parsing failed during re-parse: %s", ge)
                err_str = str(ge).lower()
                if "429" in err_str or "resource_exhausted" in err_str or "quota" in err_str:
                    return Response({
                        "error": "Gemini API quota exceeded or rate limit reached. Please wait a moment or check your billing settings."
                    }, status=status.HTTP_429_TOO_MANY_REQUESTS)
                elif "503" in err_str or "unavailable" in err_str or "demand" in err_str:
                    return Response({
                        "error": "Gemini API is temporarily experiencing high demand. Please try again in a few moments."
                    }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            
        if not resume.structured_data:
            resume.structured_data = parse_resume_text_locally(resume.parsed_text or "")
            
        resume.save(update_fields=["parsed_text", "structured_data"])
        return Response(self.get_serializer(resume).data)

    @action(detail=True, methods=["POST"])
    def tailor(self, request, pk=None):
        """Uses Gemini API to tailor the resume profile structured_data to a target Job Description."""
        resume = self.get_object()
        user = request.user
        job_description = request.data.get("job_description", "").strip()
        
        if not job_description:
            return Response({"error": "Job description is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        gemini_api_key = getattr(user, "gemini_api_key", "")
        if not gemini_api_key:
            return Response({"error": "Gemini API key is not configured. Please add it in Settings."}, status=status.HTTP_400_BAD_REQUEST)
            
        # Get structured profile JSON
        profile = resume.structured_data or {}
        
        # Prepare the Gemini client
        try:
            from google import genai
            from google.genai import types
            import json
            
            client = genai.Client(api_key=gemini_api_key)
            prompt = f"""
You are an expert career advisor.
You are given a candidate's structured resume profile (in JSON) and a target Job Description (JD).
Your task is to rewrite the resume summary, adjust the highlighted skills, and rewrite the achievements/descriptions in the experience entries to align perfectly with the key requirements of the Job Description.
DO NOT invent untruthful credentials, degrees, or companies. Focus on highlighting existing skills and framing experiences to match the JD's keywords and context.

Structured Resume Profile:
{json.dumps(profile, indent=2)}

Target Job Description:
{job_description}

Output the tailored profile in the EXACT same JSON format.
Ensure the output is clean, valid JSON. Do not wrap it in markdown code blocks like ```json. Just return the raw JSON object.
"""
            response = client.models.generate_content(
                model=getattr(user, "gemini_model", "gemini-2.5-flash") or "gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                )
            )
            
            tailored_data = json.loads(response.text)
            log_ai_usage(user, "Resume Tailoring", model_name=getattr(user, "gemini_model", "gemini-2.5-flash") or "gemini-2.5-flash")
            return Response({"tailored_data": tailored_data})
            
        except Exception as e:
            logger.error("Failed to tailor resume %s: %s", resume.id, e)
            err_str = str(e).lower()
            if "429" in err_str or "resource_exhausted" in err_str or "quota" in err_str:
                return Response(
                    {"error": "Gemini API quota exceeded or rate limit reached. Please wait a moment or check your Gemini API key billing settings."},
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )
            elif "503" in err_str or "unavailable" in err_str or "demand" in err_str:
                return Response(
                    {"error": "Gemini API is temporarily experiencing high demand. Please try again in a few moments."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )
            return Response({"error": f"Failed to tailor resume: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=["POST"])
    def compile_pdf(self, request):
        """
        Accepts raw html and uses Playwright to compile it into PDF.
        """
        html_content = request.data.get("html")
        filename = request.data.get("filename", "resume.pdf")
        if not html_content:
            return Response({"error": "HTML content is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from playwright.sync_api import sync_playwright
            with sync_playwright() as p:
                browser = p.chromium.launch()
                page = browser.new_page()
                page.set_content(html_content)
                # Wait for any network resources or styles to load
                page.wait_for_load_state("networkidle")
                
                pdf_bytes = page.pdf(
                    format="Letter",
                    margin={
                        "top": "0.32in",
                        "bottom": "0.32in",
                        "left": "0.4in",
                        "right": "0.4in"
                    },
                    print_background=True
                )
                browser.close()
            
            from django.http import HttpResponse
            response = HttpResponse(pdf_bytes, content_type="application/pdf")
            response["Content-Disposition"] = f'attachment; filename="{filename}"'
            return response
        except Exception as e:
            logger.error("Failed to compile HTML to PDF: %s", e)
            return Response({"error": f"Failed to compile PDF: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

