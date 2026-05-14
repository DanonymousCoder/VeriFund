FROM python:3.11-slim
WORKDIR /app
COPY member-service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY shared ./shared
COPY member-service ./
ENV PYTHONPATH=/app
EXPOSE 8001
CMD ["python", "manage.py", "runserver", "0.0.0.0:8001"]
