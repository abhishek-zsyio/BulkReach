"""Accounts app — URL routing."""
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.routers import DefaultRouter

from .views import (
    RegisterView,
    CustomTokenObtainPairView,
    MeView,
    GmailConnectView,
    GmailConnectConfirmView,
    GmailCallbackView,
    GmailDisconnectView,
    GoogleLoginUrlView,
    LogoutView,
    UserResumeViewSet,
)

router = DefaultRouter()
router.register(r'resumes', UserResumeViewSet, basename='resumes')

urlpatterns = [
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("login/", CustomTokenObtainPairView.as_view(), name="auth-login"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("token/refresh/", TokenRefreshView.as_view(), name="auth-token-refresh"),
    path("me/", MeView.as_view(), name="auth-me"),
    path("gmail/connect/", GmailConnectView.as_view(), name="gmail-connect"),
    path("gmail/connect/confirm/", GmailConnectConfirmView.as_view(), name="gmail-connect-confirm"),
    path("gmail/callback/", GmailCallbackView.as_view(), name="gmail-callback"),
    path("gmail/disconnect/", GmailDisconnectView.as_view(), name="gmail-disconnect"),
    path("google/login-url/", GoogleLoginUrlView.as_view(), name="google-login-url"),
    path("", include(router.urls)),
]
