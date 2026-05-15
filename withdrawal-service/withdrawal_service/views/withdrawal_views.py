from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from withdrawal_service.serializers.withdrawal_serializer import (
    LookupRecipientSerializer,
    RequestWithdrawalSerializer,
    SignWithdrawalSerializer,
)
from withdrawal_service.services.withdrawal_service import (
    get_withdrawal_detail,
    list_pending_withdrawals,
    lookup_recipient,
    request_withdrawal,
    requery_withdrawal,
    sign_withdrawal,
)


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


class LookupRecipientView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        s = LookupRecipientSerializer(data=request.data)
        if not s.is_valid():
            return Response(s.errors, status=400)
        result = lookup_recipient(
            bank_code=s.validated_data["destination_bank_code"],
            account_number=s.validated_data["destination_account"],
        )
        if "error" in result:
            return Response({"detail": result["error"]}, status=400)
        return Response(result)


class WithdrawalDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, withdrawal_id):
        result = get_withdrawal_detail(withdrawal_id)
        if "error" in result:
            return Response({"detail": result["error"]}, status=404)
        return Response(result)


class RequeryWithdrawalView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, withdrawal_id):
        result = requery_withdrawal(withdrawal_id)
        if "error" in result:
            return Response({"detail": result["error"]}, status=400)
        return Response(result)
