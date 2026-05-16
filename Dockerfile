FROM python:3.11-slim

ENV PIP_DEFAULT_TIMEOUT=300 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Copy root and all included requirements before pip (root uses -r for each service).
COPY requirements.txt ./requirements.txt
COPY api-gateway/requirements.txt ./api-gateway/requirements.txt
COPY member-service/requirements.txt ./member-service/requirements.txt
COPY cooperative-service/requirements.txt ./cooperative-service/requirements.txt
COPY contribution-service/requirements.txt ./contribution-service/requirements.txt
COPY withdrawal-service/requirements.txt ./withdrawal-service/requirements.txt
COPY notification-service/requirements.txt ./notification-service/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN chmod +x /app/start.sh

ENV PYTHONPATH=/app
EXPOSE 8000

CMD ["/app/start.sh"]
