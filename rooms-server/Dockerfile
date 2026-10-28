FROM python:3.13-slim
WORKDIR /srv
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && useradd --uid 10001 --create-home rooms && mkdir /data && chown rooms:rooms /data
COPY server.py .
COPY cloudflare/migrations/0003_automatic_room_sharing.sql ./auto-sharing.sql
ENV ROOMS_DATA_DIR=/data PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
USER rooms
EXPOSE 8000
CMD ["gunicorn", "server:create_app()", "--bind", "0.0.0.0:8000", "--worker-class", "gthread", "--workers", "1", "--threads", "4", "--timeout", "30", "--max-requests", "2000", "--max-requests-jitter", "100", "--access-logfile", "-"]
