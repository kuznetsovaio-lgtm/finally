# start_windows.ps1 - Build and run the FinAlly Docker container on Windows
# Idempotent: stops and removes an existing container before starting fresh.

param(
    [switch]$NoBuild
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
if (-not $ProjectRoot) { $ProjectRoot = $PSScriptRoot }

# Stop and remove any existing container (idempotent - silently continues if none exists)
$existing = docker ps -a --filter "name=finally_app" --format "{{.ID}}"
if ($existing) {
    Write-Host "Stopping existing container..."
    docker stop $existing --timeout 5 2>$null
    docker rm $existing 2>$null
}

if (-not $NoBuild) {
    Write-Host "Building Docker image..."
    docker build -t finally "$ProjectRoot"
}

Write-Host "Starting FinAlly container..."
docker run -d `
    --name finally_app `
    -p 8000:8000 `
    --env-file "$ProjectRoot\.env" `
    -v finally-data:/app/db `
    finally

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to start container. Is Docker running?"
}

Write-Host "FinAlly is running at http://localhost:8000"
