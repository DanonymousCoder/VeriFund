from django.urls import path
from ai_service.views.ai_views import (
    AllHealthScoresView, AnalyzeGraphView, ScoreCooperativeView, ScoreTransactionView, TriageReportView
)

urlpatterns = [
    path("score-transaction/", ScoreTransactionView.as_view()),
    path("score-cooperative/", ScoreCooperativeView.as_view()),
    path("score-cooperative/<str:cooperative_id>/", ScoreCooperativeView.as_view()),
    path("analyze-graph/", AnalyzeGraphView.as_view()),
    path("analyze-graph/<str:cooperative_id>/", AnalyzeGraphView.as_view()),
    path("triage-report/", TriageReportView.as_view()),
    path("health-scores/", AllHealthScoresView.as_view()),
    path("health-scores/all/", AllHealthScoresView.as_view()),
]
