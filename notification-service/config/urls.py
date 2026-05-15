from django.urls import path, include
urlpatterns = [
    path("api/notify/", include("notification_service.urls.notification_urls")),
]
