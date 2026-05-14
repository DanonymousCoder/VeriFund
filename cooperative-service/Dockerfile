FROM python:3.11-slim
WORKDIR /app
COPY cooperative-service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY shared ./shared
COPY cooperative-service ./
ENV PYTHONPATH=/app
EXPOSE 8002
CMD ["python", "manage.py", "runserver", "0.0.0.0:8002"]
