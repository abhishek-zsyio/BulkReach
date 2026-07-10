"""Template URL routing — separate from campaign URLs per spec."""
from django.urls import path
from .views import TemplateListCreateView, TemplateDetailView, TemplatePreviewView, TemplateGenerateView

urlpatterns = [
    path("", TemplateListCreateView.as_view(), name="template-list-create"),
    path("generate/", TemplateGenerateView.as_view(), name="template-generate"),
    path("<int:pk>/", TemplateDetailView.as_view(), name="template-detail"),
    path("<int:pk>/preview/", TemplatePreviewView.as_view(), name="template-preview"),
]
