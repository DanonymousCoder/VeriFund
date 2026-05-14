"""
Squad webhook receiver.
Squad fires POST requests to this endpoint for every transaction on a Virtual Account.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.request import Request
from shared.squad.client import verify_webhook_signature
from contribution_service.services.contribution_service import record_contribution


class SquadWebhookView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request: Request):
        signature = request.headers.get("x-squad-signature", "") or request.headers.get("x-squad-encrypted-body", "")
        if not verify_webhook_signature(request.body, signature, request.data):
            return Response({"detail": "Invalid signature."}, status=401)

        event = (request.data.get("Event") or request.data.get("event") or "").lower()
        if event in {"charge_successful", "charge.completed"}:
            result = record_contribution(request.data)
            if "error" in result:
                return Response({"detail": result["error"]}, status=400)
            return Response({"status": "processed", "contribution_id": result.get("id")})

        # Acknowledge other events without processing
        return Response({"status": "ignored"})
