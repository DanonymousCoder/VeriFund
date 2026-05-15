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
    "withdrawal_service",
]
MIDDLEWARE = ["django.middleware.common.CommonMiddleware"]
ROOT_URLCONF = "config.urls"
default_db = env.db("DATABASE_URL")
default_db.setdefault("CONN_MAX_AGE", 0)
default_db.setdefault("CONN_HEALTH_CHECKS", True)
default_db.setdefault("OPTIONS", {})
default_db["OPTIONS"].setdefault("connect_timeout", int(env("DATABASE_CONNECT_TIMEOUT", default=10)))
default_db["OPTIONS"].setdefault("sslmode", env("DATABASE_SSLMODE", default="prefer"))

DATABASES = {"default": default_db}
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["shared.middleware.auth.JWTAuthentication"],
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
