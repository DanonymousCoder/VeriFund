from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from member_service.services.member_service import get_member_profile


class MemberProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        member_id = request.user.get("member_id")
        profile = get_member_profile(member_id)
        if not profile:
            return Response({"detail": "Member not found."}, status=404)
        return Response(profile)
