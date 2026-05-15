from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from cooperative_service.serializers.cooperative_serializer import CreateCooperativeSerializer
from cooperative_service.services.cooperative_service import (
    create_cooperative,
    get_cooperative,
    get_regulator_summary,
    get_trust_score,
)


class CreateCooperativeView(APIView):
    def post(self, request):
        s = CreateCooperativeSerializer(data=request.data)
        if not s.is_valid():
            return Response(s.errors, status=400)
        result = create_cooperative(s.validated_data)
        if "error" in result:
            return Response({"detail": result["error"]}, status=400)
        return Response(result, status=201)


class CooperativeDetailView(APIView):
    def get(self, request, cooperative_id):
        cooperative = get_cooperative(cooperative_id)
        if not cooperative:
            return Response({"detail": "Cooperative not found."}, status=404)
        return Response(cooperative)


class TrustScoreView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request, cooperative_id):
        result = get_trust_score(cooperative_id)
        if "error" in result:
            return Response({"detail": result["error"]}, status=404)
        return Response(result)


class RegulatorSummaryView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request, cooperative_id):
        result = get_regulator_summary(cooperative_id)
        if "error" in result:
            return Response({"detail": result["error"]}, status=404)
        return Response(result)
