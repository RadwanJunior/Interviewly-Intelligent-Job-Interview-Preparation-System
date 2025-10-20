# ---------- Frontend build ----------
FROM node:20 AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build  # Produces /app/frontend/dist (for Vite/React)

# ---------- Backend runtime ----------
FROM python:3.11-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1

# Install backend dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Copy built frontend into backend static directory
COPY --from=frontend /app/frontend/out /app/backend/static

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
