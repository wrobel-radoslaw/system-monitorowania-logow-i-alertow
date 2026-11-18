FROM python:3.12-alpine

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app
COPY generate_events.py .

USER nobody
ENTRYPOINT ["python", "generate_events.py"]
CMD ["--send", "--forever", "--interval", "5"]
