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
    "notification_service",
]
MIDDLEWARE = ["django.middleware.common.CommonMiddleware"]
ROOT_URLCONF = "config.urls"
DATABASES = {"default": env.db("DATABASE_URL")}
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["shared.middleware.auth.JWTAuthentication"],
}
CELERY_BROKER_URL = env("REDIS_URL", default="redis://localhost:6379/0")
AT_USERNAME = env("AT_USERNAME", default="sandbox")
AT_API_KEY = env("AT_API_KEY", default="")
