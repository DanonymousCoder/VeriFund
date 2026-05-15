from django.urls import path
from cooperative_service.views.cooperative_views import (
    CreateCooperativeView, CooperativeDetailView, RegulatorSummaryView, TrustScoreView
)

urlpatterns = [
    path("", CreateCooperativeView.as_view()),
    path("<str:cooperative_id>/", CooperativeDetailView.as_view()),
    path("<str:cooperative_id>/trust-score/", TrustScoreView.as_view()),
    path("<str:cooperative_id>/regulator-summary/", RegulatorSummaryView.as_view()),
]
