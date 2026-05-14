from django.urls import path
from withdrawal_service.views.withdrawal_views import (
    RequestWithdrawalView, SignWithdrawalView, PendingWithdrawalsView
)
urlpatterns = [
    path("request/", RequestWithdrawalView.as_view()),
    path("<str:withdrawal_id>/sign/", SignWithdrawalView.as_view()),
    path("pending/", PendingWithdrawalsView.as_view()),
]
