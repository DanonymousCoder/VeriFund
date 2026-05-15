from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from member_service.serializers.member_serializer import RegisterSerializer, LoginSerializer
from member_service.services.member_service import register_member, login_member


class RegisterView(APIView):
    authentication_classes = []  # public endpoint
    permission_classes = []

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        result = register_member(serializer.validated_data)
        if "error" in result:
            return Response({"detail": result["error"]}, status=status.HTTP_400_BAD_REQUEST)

        return Response(result, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        result = login_member(
            serializer.validated_data["phone_number"],
            serializer.validated_data["password"],
        )
        if "error" in result:
            return Response({"detail": result["error"]}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(result)
