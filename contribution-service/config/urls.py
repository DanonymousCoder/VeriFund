from django.urls import path, include
urlpatterns = [
    path("api/contributions/", include("contribution_service.urls.contribution_urls")),
    path("api/webhooks/", include("contribution_service.urls.webhook_urls")),
]
