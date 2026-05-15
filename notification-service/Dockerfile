FROM python:3.11-slim
WORKDIR /app
COPY notification-service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY shared ./shared
COPY notification-service ./
ENV PYTHONPATH=/app
EXPOSE 8006
CMD ["sh", "-c", "python manage.py runserver 0.0.0.0:${PORT:-8006}"]
