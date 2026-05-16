FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PIP_DEFAULT_TIMEOUT=300 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

COPY ai-service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY shared ./shared
COPY ai-service ./

EXPOSE 8005

CMD ["sh", "-c", "python manage.py runserver 0.0.0.0:${PORT:-8005}"]
