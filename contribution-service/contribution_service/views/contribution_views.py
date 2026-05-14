from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from contribution_service.serializers.contribution_serializer import (
    CreateContributionVirtualAccountSerializer,
    DebitMandateSerializer,
    CreateMandateSerializer,
    SimulateVirtualAccountPaymentSerializer,
)
from contribution_service.services.contribution_service import (
    create_mandate,
    create_member_virtual_account,
    debit_existing_mandate,
    get_cooperative_contribution_audit,
    get_member_contributions,
    get_member_virtual_accounts,
    list_webhook_events,
    simulate_member_virtual_account_payment,
    sync_mandate_status,
)


class CreateMandateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreateMandateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        member_id = request.user.get("member_id")
        result = create_mandate(member_id, serializer.validated_data["cooperative_id"], serializer.validated_data)
        if "error" in result:
            return Response({"detail": result["error"]}, status=400)
        return Response(result, status=201)


class CreateContributionVirtualAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreateContributionVirtualAccountSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        member_id = request.user.get("member_id")
        result = create_member_virtual_account(member_id, serializer.validated_data)
        if "error" in result:
            return Response({"detail": result["error"]}, status=400)
        return Response(result, status=201)


class MemberContributionVirtualAccountsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        member_id = request.user.get("member_id")
        return Response({"member_id": member_id, "virtual_accounts": get_member_virtual_accounts(member_id)})


class SimulateContributionVirtualAccountPaymentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = SimulateVirtualAccountPaymentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        member_id = request.user.get("member_id")
        result = simulate_member_virtual_account_payment(member_id, serializer.validated_data)
        if "error" in result:
            return Response({"detail": result["error"]}, status=400)
        return Response(result)


class ContributionHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        member_id = request.user.get("member_id")
        return Response({"member_id": member_id, "contributions": get_member_contributions(member_id)})


class CooperativeContributionAuditView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, cooperative_id):
        result = get_cooperative_contribution_audit(cooperative_id)
        if "error" in result:
            return Response({"detail": result["error"]}, status=404)
        return Response(result)


class MandateStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, reference):
        result = sync_mandate_status(reference)
        if "error" in result:
            return Response({"detail": result["error"]}, status=404)
        return Response(result)


class DebitMandateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = DebitMandateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        member_id = request.user.get("member_id")
        result = debit_existing_mandate(member_id, serializer.validated_data)
        if "error" in result:
            return Response({"detail": result["error"]}, status=400)
        return Response(result, status=201)


class WebhookEventListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        limit = int(request.query_params.get("limit", "50"))
        return Response({"events": list_webhook_events(limit=max(1, min(limit, 200)))})
