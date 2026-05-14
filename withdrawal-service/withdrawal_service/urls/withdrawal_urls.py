from django.urls import path
from withdrawal_service.views.withdrawal_views import (
    LookupRecipientView, PendingWithdrawalsView, RequeryWithdrawalView, RequestWithdrawalView, SignWithdrawalView,
    WithdrawalDetailView
)
urlpatterns = [
    path("lookup/", LookupRecipientView.as_view()),
    path("request/", RequestWithdrawalView.as_view()),
    path("<str:withdrawal_id>/", WithdrawalDetailView.as_view()),
    path("<str:withdrawal_id>/sign/", SignWithdrawalView.as_view()),
    path("<str:withdrawal_id>/requery/", RequeryWithdrawalView.as_view()),
    path("pending/", PendingWithdrawalsView.as_view()),
]
