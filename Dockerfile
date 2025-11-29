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

# Stage 2: Build backend + bundle frontend assets
FROM python:3.12-slim AS backend
WORKDIR /app

# Install Python deps
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ .

# Copy exported frontend into the image
COPY --from=frontend /app/frontend/out ./frontend-static

ENV PORT=8000
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
