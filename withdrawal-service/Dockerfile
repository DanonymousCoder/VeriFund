FROM python:3.11-slim
WORKDIR /app
COPY withdrawal-service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY shared ./shared
COPY withdrawal-service ./
ENV PYTHONPATH=/app
EXPOSE 8004
CMD ["sh", "-c", "python manage.py runserver 0.0.0.0:${PORT:-8004}"]
