#!/bin/bash
# start_mac.sh — Build and run the FinAlly Docker container on macOS/Linux
# Idempotent: stops and removes an existing container before starting fresh.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Stop and remove any existing container (idempotent — silently continues if none exists)
existing=$(docker ps -a --filter "name=finally_app" --format "{{.ID}}" 2>/dev/null || true)
if [ -n "$existing" ]; then
    echo "Stopping existing container..."
    docker stop $existing --time 5 2>/dev/null || true
    docker rm $existing 2>/dev/null || true
fi

echo "Building Docker image..."
docker build -t finally "$PROJECT_ROOT"

echo "Starting FinAlly container..."
docker run -d \
    --name finally_app \
    -p 8000:8000 \
    --env-file "$PROJECT_ROOT/.env" \
    -v finally-data:/app/db \
    finally

echo "FinAlly is running at http://localhost:8000"
