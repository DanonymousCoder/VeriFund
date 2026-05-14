from django.urls import path, include
urlpatterns = [
    path("api/withdrawals/", include("withdrawal_service.urls.withdrawal_urls")),
]
