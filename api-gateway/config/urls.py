"""
API Gateway routes.
All frontend requests hit :8000 — gateway proxies to the right service.
This keeps the frontend's base URL constant regardless of internal refactoring.
"""

from django.urls import path

from gateway.health_views import HealthView
from gateway.proxy_views import ProxyView

urlpatterns = [
    path("health/", HealthView.as_view()),
    path("api/health/", HealthView.as_view()),
    # Auth + Member
    path("api/auth/<path:path>", ProxyView.as_view(service="MEMBER_SERVICE_URL", prefix="api/auth/")),
    path("api/members/<path:path>", ProxyView.as_view(service="MEMBER_SERVICE_URL", prefix="api/members/")),

    # Cooperatives
    path("api/cooperatives/", ProxyView.as_view(service="COOPERATIVE_SERVICE_URL", prefix="api/cooperatives/")),
    path("api/cooperatives/<path:path>", ProxyView.as_view(service="COOPERATIVE_SERVICE_URL", prefix="api/cooperatives/")),

    # Contributions + Webhooks
    path("api/contributions/<path:path>", ProxyView.as_view(service="CONTRIBUTION_SERVICE_URL", prefix="api/contributions/")),
    path("api/webhooks/<path:path>", ProxyView.as_view(service="CONTRIBUTION_SERVICE_URL", prefix="api/webhooks/")),

    # Withdrawals
    path("api/withdrawals/<path:path>", ProxyView.as_view(service="WITHDRAWAL_SERVICE_URL", prefix="api/withdrawals/")),

    # AI
    path("api/ai/<path:path>", ProxyView.as_view(service="AI_SERVICE_URL", prefix="api/ai/")),
]
