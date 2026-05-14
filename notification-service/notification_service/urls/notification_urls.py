from django.urls import path
from notification_service.views.notification_views import SendNotificationView
urlpatterns = [
    path("sms/", SendNotificationView.as_view()),
]
