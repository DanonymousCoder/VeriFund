from rest_framework.response import Response
from rest_framework.views import APIView

from notification_service.services.notify_service import list_notifications, send_notification


class SendNotificationView(APIView):
    def post(self, request):
        message = request.data.get("message")
        if not message:
            return Response({"detail": "message is required."}, status=400)

        email = request.data.get("email") or request.data.get("to")
        phone_number = request.data.get("phone_number")
        if not email and not phone_number:
            return Response({"detail": "email or phone_number is required."}, status=400)

        subject = request.data.get("subject", "VeriFund Notification")
        result = send_notification(
            email=email,
            phone_number=phone_number,
            message=message,
            subject=subject,
        )
        return Response(result)


class NotificationHistoryView(APIView):
    def get(self, request):
        recipient = request.query_params.get("recipient")
        status = request.query_params.get("status")
        limit = int(request.query_params.get("limit", "50"))
        bounded = max(1, min(limit, 200))
        return Response(
            {
                "notifications": list_notifications(recipient=recipient, status=status, limit=bounded),
                "filters": {"recipient": recipient, "status": status, "limit": bounded},
            }
        )
