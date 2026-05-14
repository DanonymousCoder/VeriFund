from django.urls import path, include

urlpatterns = [
    path("api/members/", include("member_service.urls.member_urls")),
    path("api/auth/", include("member_service.urls.auth_urls")),
]
