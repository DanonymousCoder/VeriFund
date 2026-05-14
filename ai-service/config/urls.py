from django.urls import path, include
urlpatterns = [
    path("api/ai/", include("ai_service.urls")),
]
