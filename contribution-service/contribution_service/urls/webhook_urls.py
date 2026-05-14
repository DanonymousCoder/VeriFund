from django.urls import path
from contribution_service.webhooks.squad_webhook import SquadWebhookView
urlpatterns = [
    path("squad/", SquadWebhookView.as_view()),
]
