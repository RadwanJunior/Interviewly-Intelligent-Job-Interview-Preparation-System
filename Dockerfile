# Stage 1: Build frontend
FROM node:20-alpine AS frontend
WORKDIR /app/frontend

# Install dependencies
COPY frontend/package*.json ./
RUN npm ci

# Build static output (Next.js)
COPY frontend/ .
# Allow overriding API URL at build-time if needed
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN npm run build

# Stage 2: Build backend + bundle frontend assets + n8n
FROM python:3.12-slim AS backend
WORKDIR /app

ARG N8N_VERSION=1.74.1

# Install system deps and Node for n8n
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates gnupg \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && npm install -g n8n@${N8N_VERSION} \
    && apt-get purge -y gnupg curl \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ .

# Copy exported frontend into the image
COPY --from=frontend /app/frontend/out ./frontend-static

# Entrypoint script to run uvicorn + n8n
COPY infra/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV PORT=8000
ENV N8N_PORT=5678
EXPOSE 8000 5678

ENTRYPOINT ["/entrypoint.sh"]
