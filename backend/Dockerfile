# 1. Use official Python image
FROM python:3.12-slim

# 2. Set working directory
WORKDIR /app

# 3. Install system deps (if needed for pdf/docx parsing)
# RUN apt-get update && apt-get install -y poppler-utils libreoffice && rm -rf /var/lib/apt/lists/*

# 4. Copy backend code
COPY . /app

# 5. Install Python deps
RUN pip install --no-cache-dir -r requirements.txt

# 6. Expose port
EXPOSE 8000

# 7. Run FastAPI
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
