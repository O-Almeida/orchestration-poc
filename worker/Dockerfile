# worker/Dockerfile
FROM python:3.9-slim

WORKDIR /app

# Install required Python packages
COPY worker_entrypoint.py /app/worker_entrypoint.py
RUN pip install --no-cache-dir pika requests

CMD ["python", "worker_entrypoint.py"]
