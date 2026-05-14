from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from member_service.serializers.member_serializer import UpdateMemberProfileSerializer
from member_service.services.member_service import get_member_profile, update_member_profile


class MemberProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        member_id = request.user.get("member_id")
        profile = get_member_profile(member_id)
        if not profile:
            return Response({"detail": "Member not found."}, status=404)
        return Response(profile)

    def patch(self, request):
        serializer = UpdateMemberProfileSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        member_id = request.user.get("member_id")
        result = update_member_profile(member_id, serializer.validated_data)
        if "error" in result:
            return Response({"detail": result["error"]}, status=400)
        return Response(result)
