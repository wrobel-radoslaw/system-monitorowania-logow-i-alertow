FROM python:3.12-alpine

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app
COPY webhook_stub.py .

EXPOSE 8080

USER nobody
CMD ["python", "webhook_stub.py", "--host", "0.0.0.0", "--port", "8080"]
