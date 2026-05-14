from rest_framework.views import APIView
from rest_framework.response import Response
from ai_service.services.anomaly_service import score_transaction
from ai_service.services.risk_service import score_all_cooperatives, score_cooperative
from ai_service.services.whistleblower_service import triage_report


class ScoreTransactionView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        result = score_transaction(request.data)
        return Response(result)


class ScoreCooperativeView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request, cooperative_id):
        result = score_cooperative(cooperative_id)
        return Response(result)

    def post(self, request):
        cooperative_id = request.data.get("cooperative_id")
        if not cooperative_id:
            return Response({"detail": "cooperative_id is required."}, status=400)
        result = score_cooperative(cooperative_id, features=request.data.get("breakdown") or request.data.get("features"))
        return Response(result)


class TriageReportView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        report_text = request.data.get("report_text", "")
        cooperative_id = request.data.get("reporter_cooperative_id", "")
        result = triage_report(report_text, cooperative_id)
        return Response(result)


class AllHealthScoresView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        return Response({"scores": score_all_cooperatives()})
