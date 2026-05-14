from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from withdrawal_service.serializers.withdrawal_serializer import RequestWithdrawalSerializer, SignWithdrawalSerializer
from withdrawal_service.services.withdrawal_service import list_pending_withdrawals, request_withdrawal, sign_withdrawal


class RequestWithdrawalView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        s = RequestWithdrawalSerializer(data=request.data)
        if not s.is_valid():
            return Response(s.errors, status=400)
        member_id = request.user.get("member_id")
        role = request.user.get("role")
        result = request_withdrawal(member_id, role, s.validated_data)
        if "error" in result:
            return Response({"detail": result["error"]}, status=400)
        return Response(result, status=201)


class SignWithdrawalView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, withdrawal_id):
        s = SignWithdrawalSerializer(data=request.data)
        if not s.is_valid():
            return Response(s.errors, status=400)
        member_id = request.user.get("member_id")
        actor_role = request.user.get("role")
        result = sign_withdrawal(withdrawal_id, member_id, s.validated_data["role"], actor_role=actor_role)
        if "error" in result:
            return Response({"detail": result["error"]}, status=400)
        return Response(result)


class PendingWithdrawalsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cooperative_id = request.query_params.get("cooperative_id")
        return Response({"pending": list_pending_withdrawals(cooperative_id), "cooperative_id": cooperative_id})
