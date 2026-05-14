from rest_framework.views import APIView
from rest_framework.response import Response
from notification_service.services.sms_service import send_sms


class SendNotificationView(APIView):
    def post(self, request):
        phone_number = request.data.get("phone_number")
        message = request.data.get("message")
        if not phone_number or not message:
            return Response({"detail": "phone_number and message are required."}, status=400)
        result = send_sms(phone_number, message)
        return Response(result)
