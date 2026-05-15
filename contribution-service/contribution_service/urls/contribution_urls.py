from django.urls import path
from contribution_service.views.contribution_views import (
    ContributionHistoryView,
    CooperativeContributionAuditView,
    CreateContributionVirtualAccountView,
    MemberContributionVirtualAccountsView,
    SimulateContributionVirtualAccountPaymentView,
    WebhookEventListView,
)
urlpatterns = [
    path("virtual-account/", CreateContributionVirtualAccountView.as_view()),
    path("virtual-account/list/", MemberContributionVirtualAccountsView.as_view()),
    path("virtual-account/simulate/", SimulateContributionVirtualAccountPaymentView.as_view()),
    path("history/", ContributionHistoryView.as_view()),
    path("audit/<str:cooperative_id>/", CooperativeContributionAuditView.as_view()),
    path("webhooks/events/", WebhookEventListView.as_view()),
]
