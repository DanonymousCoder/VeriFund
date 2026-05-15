FROM python:3.11-slim
WORKDIR /app
COPY api-gateway/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY shared ./shared
COPY api-gateway ./
ENV PYTHONPATH=/app
EXPOSE 8000
CMD ["sh", "-c", "python manage.py runserver 0.0.0.0:${PORT:-8000}"]
