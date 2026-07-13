# stop_windows.ps1 — Stop and remove the FinAlly container.
# Does NOT remove the Docker volume — data persists.

$ErrorActionPreference = 'Stop'

$existing = docker ps -a --filter "name=finally_app" --format "{{.ID}}"
if ($existing) {
    Write-Host "Stopping container..."
    docker stop $existing --time 5 2>$null
    docker rm $existing 2>$null
    Write-Host "Container removed."
} else {
    Write-Host "No running container named 'finally_app' found."
}
