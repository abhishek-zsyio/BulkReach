"""Accounts app — serializers."""
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import UserProfile, UserResume

class UserResumeSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserResume
        fields = ("id", "name", "file", "parsed_text", "structured_data", "is_default", "created_at")
        read_only_fields = ("id", "parsed_text", "created_at")
        extra_kwargs = {
            "file": {"required": False, "allow_null": True}
        }


class RegisterSerializer(serializers.ModelSerializer):
    """Handles user registration with password confirmation."""

    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True, label="Confirm password")

    class Meta:
        model = UserProfile
        fields = ("id", "username", "email", "first_name", "last_name", "password", "password2")
        extra_kwargs = {
            "email": {"required": True},
            "first_name": {"required": True},
            "last_name": {"required": True},
        }

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        if UserProfile.objects.filter(email=attrs["email"]).exists():
            raise serializers.ValidationError({"email": "A user with this email already exists."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password2")
        user = UserProfile.objects.create_user(**validated_data)
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Public user profile serializer.
    IMPORTANT: Gmail tokens are NEVER included here.
    """

    gmail_connected = serializers.BooleanField(read_only=True)
    has_gemini_api_key = serializers.SerializerMethodField(read_only=True)
    gemini_api_key = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = UserProfile
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "sender_name",
            "sender_email",
            "gmail_connected",
            "gmail_token_expiry",
            "resume_text",
            "gemini_api_key",
            "has_gemini_api_key",
            "gemini_model",
            "is_onboarded",
            "created_at",
        )
        read_only_fields = ("id", "gmail_connected", "gmail_token_expiry", "has_gemini_api_key", "created_at")

    def get_has_gemini_api_key(self, obj) -> bool:
        return bool(obj.gemini_api_key)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """JWT token serializer that includes user info in the response."""

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserProfileSerializer(self.user).data
        return data
