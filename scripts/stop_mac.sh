#!/bin/bash
# stop_mac.sh — Stop and remove the FinAlly container.
# Does NOT remove the Docker volume — data persists.

set -e

existing=$(docker ps -a --filter "name=finally_app" --format "{{.ID}}" 2>/dev/null || true)
if [ -n "$existing" ]; then
    echo "Stopping container..."
    docker stop $existing --time 5 2>/dev/null || true
    docker rm $existing 2>/dev/null || true
    echo "Container removed."
else
    echo "No running container named 'finally_app' found."
fi
