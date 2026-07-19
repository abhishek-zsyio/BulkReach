"""
Root URL configuration for BulkReach.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

from django.http import JsonResponse

def health_check(request):
    return JsonResponse({"status": "ok"})

urlpatterns = [
    path("admin/", admin.site.urls),

    # API Schema / Docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),

    # Health check
    path("api/health/", health_check, name="health-check"),

    # App routes
    path("api/auth/", include("apps.accounts.urls")),
    path("api/campaigns/", include("apps.campaigns.urls")),
    path("api/templates/", include("apps.campaigns.template_urls")),
    path("api/recipients/", include("apps.recipients.urls")),
    path("api/logs/", include("apps.logs.urls")),
    path("api/scraper/", include("apps.scraper.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
