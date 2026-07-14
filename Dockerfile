# Stage 1: Build Next.js frontend
FROM node:20-slim AS builder

WORKDIR /app

# Copy and install dependencies (package-lock.json is optional)
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci || npm install

# Copy remaining frontend source and build
COPY frontend/ ./
RUN npm run build

# Stage 2: Runtime - Python / FastAPI
FROM python:3.12-slim

WORKDIR /app/backend

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy backend project files into their actual project root
COPY backend/pyproject.toml backend/uv.lock* backend/README.md ./
COPY backend/app ./app
COPY backend/db ./db
COPY backend/llm ./llm
COPY backend/tests ./tests
COPY backend/db_client.py backend/market_data_demo.py ./

# Install Python dependencies from the backend project root
RUN uv sync --frozen

# Copy the static Next.js build output from the builder stage
COPY --from=builder /app/out ./static/

ENV PYTHONUNBUFFERED=1
EXPOSE 8000

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
