"""
Simple reverse-proxy view.
Forwards requests to the appropriate downstream service,
passing the Authorization header through.
"""

import httpx
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.request import Request


class ProxyView(APIView):
    service: str = ""      # e.g. "MEMBER_SERVICE_URL"
    prefix: str = ""       # path prefix to strip before forwarding

    authentication_classes = []
    permission_classes = []

    def _forward(self, request: Request, path: str):
        base_url = getattr(settings, self.service)
        target_url = f"{base_url}/{self.prefix}{path}"
        headers = {}
        if "Authorization" in request.headers:
            headers["Authorization"] = request.headers["Authorization"]

        try:
            response = httpx.request(
                method=request.method,
                url=target_url,
                headers=headers,
                json=request.data if request.method in ("POST", "PUT", "PATCH") else None,
                params=request.query_params,
                timeout=45,
            )
            try:
                body = response.json()
            except ValueError:
                body = {"detail": response.text}
            return Response(body, status=response.status_code)
        except httpx.ConnectError:
            return Response({"detail": f"Service unavailable: {self.service}"}, status=503)

    def get(self, request: Request, path: str = ""):
        return self._forward(request, path)

    def post(self, request: Request, path: str = ""):
        return self._forward(request, path)

    def put(self, request: Request, path: str = ""):
        return self._forward(request, path)

    def patch(self, request: Request, path: str = ""):
        return self._forward(request, path)

    def delete(self, request: Request, path: str = ""):
        return self._forward(request, path)
