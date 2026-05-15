from pathlib import Path
from shared.env import configure_env
BASE_DIR = Path(__file__).resolve().parent.parent
env = configure_env(BASE_DIR)
SECRET_KEY = env("SECRET_KEY")
DEBUG = env.bool("DEBUG", True)
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["*"])
INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "rest_framework",
    "gateway",
]
MIDDLEWARE = ["django.middleware.common.CommonMiddleware"]
ROOT_URLCONF = "config.urls"
DATABASES = {}
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["shared.middleware.auth.JWTAuthentication"],
}
# Downstream service URLs
MEMBER_SERVICE_URL = env("MEMBER_SERVICE_URL")
COOPERATIVE_SERVICE_URL = env("COOPERATIVE_SERVICE_URL")
CONTRIBUTION_SERVICE_URL = env("CONTRIBUTION_SERVICE_URL")
WITHDRAWAL_SERVICE_URL = env("WITHDRAWAL_SERVICE_URL")
AI_SERVICE_URL = env("AI_SERVICE_URL")
NOTIFICATION_SERVICE_URL = env("NOTIFICATION_SERVICE_URL", default="http://notification-service:8006")
