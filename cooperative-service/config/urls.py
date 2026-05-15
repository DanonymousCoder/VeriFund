from django.urls import path, include
urlpatterns = [
    path("api/cooperatives/", include("cooperative_service.urls.cooperative_urls")),
]
