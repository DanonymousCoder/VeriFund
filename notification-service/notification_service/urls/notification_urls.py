from django.urls import path

from notification_service.views.notification_views import NotificationHistoryView, SendNotificationView

urlpatterns = [
    path("email/", SendNotificationView.as_view()),
    path("sms/", SendNotificationView.as_view()),
    path("history/", NotificationHistoryView.as_view()),
]
