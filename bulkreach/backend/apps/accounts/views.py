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

from .models import UserProfile, UserResume
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


class GmailConnectView(APIView):
    """GET /api/auth/gmail/connect/ — redirect user to Google OAuth2 consent screen."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        redirect_to = request.query_params.get("redirect_to", "dashboard")
        oauth_service = GmailOAuthService()
        state_str = f"{request.user.id}:{redirect_to}"
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


class GmailCallbackView(APIView):
    """GET /api/auth/gmail/callback/ — handle OAuth2 callback for both login and connect flows."""

    permission_classes = [AllowAny]

    def get(self, request):
        code = request.query_params.get("code")
        state = request.query_params.get("state")

        if not code:
            return redirect(f"{settings.FRONTEND_URL}/dashboard?gmail_connected=false&error=missing_code")

        oauth_service = GmailOAuthService()
        try:
            if state and state.startswith("login_"):
                # Handle Google Login / Register
                user, tokens = oauth_service.login_or_register_via_google(code=code, state=state)
                # Redirect to frontend callback route with JWT tokens
                return redirect(
                    f"{settings.FRONTEND_URL}/google-callback?access={tokens['access']}&refresh={tokens['refresh']}"
                )
            else:
                # Redirect to frontend dashboard / onboarding / settings with parameters for secure POST exchange
                redirect_page = "dashboard"
                user_id_str = state
                if state and ":" in state:
                    user_id_str, redirect_page = state.split(":", 1)

                try:
                    user_id = int(user_id_str)
                    user = UserProfile.objects.get(pk=user_id)
                    if not user.is_onboarded:
                        redirect_page = "onboarding"
                except Exception:
                    pass

                return redirect(f"{settings.FRONTEND_URL}/{redirect_page}?gmail_code={code}&gmail_state={state}")
        except Exception as exc:
            logger.exception("Gmail OAuth callback error: %s", exc)
            return redirect(f"{settings.FRONTEND_URL}/dashboard?gmail_connected=false&error=oauth_error")


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
        
        # Generate a random state string for PKCE determinism
        random_state = uuid.uuid4().hex
        
        flow = oauth_service._get_flow()
        # Set deterministic code verifier for login
        seed = f"login-{random_state}-{settings.SECRET_KEY}"
        flow.code_verifier = base64.urlsafe_b64encode(hashlib.sha256(seed.encode()).digest()).decode().rstrip("=")
        
        auth_url, _ = flow.authorization_url(
            access_type="offline",
            include_granted_scopes="true",
            prompt="consent",
            state=f"login_{random_state}",
        )
        return Response({"auth_url": auth_url})


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
                            model=getattr(user, "gemini_model", "gemini-3.5-flash") or "gemini-3.5-flash"
                        )
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
                    model=getattr(user, "gemini_model", "gemini-3.5-flash") or "gemini-3.5-flash"
                )
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
                model=getattr(user, "gemini_model", "gemini-3.5-flash") or "gemini-3.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                )
            )
            
            tailored_data = json.loads(response.text)
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

