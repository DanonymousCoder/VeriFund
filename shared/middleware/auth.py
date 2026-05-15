import jwt
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from shared.utils.jwt_utils import decode_token


class AuthenticatedUser:
    def __init__(self, payload: dict):
        self.payload = payload

    @property
    def is_authenticated(self) -> bool:
        return True

    def get(self, key, default=None):
        return self.payload.get(key, default)

    def __getitem__(self, key):
        return self.payload[key]


class JWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return None
        token = auth.split(" ", 1)[1]
        try:
            payload = decode_token(token)
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed("Token has expired.")
        except jwt.InvalidTokenError:
            raise AuthenticationFailed("Invalid token.")
        return (AuthenticatedUser(payload), token)
