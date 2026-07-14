# devops — task status

## Current work
All files written and verified.

## Done
- `Dockerfile` (multi-stage: Node → Python, uv, static export mount)
- `docker-compose.yml` (volume mount, healthcheck, port 8000)
- `scripts/start_windows.ps1` (idempotent, -NoBuild flag)
- `scripts/stop_windows.ps1`
- `scripts/start_mac.sh`
- `scripts/stop_mac.sh`
- `test/docker-compose.test.yml` (app + Playwright service, shared network)
- `.env.example`

## Blocked
- None

## Instructions
Read `planning/TEAM_LEAD_INSTRUCTIONS.md` for full context. Write all files listed under "DevOps" in that doc.

## Key requirements
- Multi-stage Dockerfile: Stage 1 builds Next.js static export, Stage 2 installs uv + Python deps + serves FastAPI on port 8000
- `db/` directory must be volume-mounted at `/app/db`
- `.env` file passed via `--env-file`
- Start scripts must be idempotent
- `test/docker-compose.test.yml` spins up the app + Playwright browser service

## Files to create
- `Dockerfile`
- `docker-compose.yml`
- `scripts/start_windows.ps1`
- `scripts/stop_windows.ps1`
- `scripts/start_mac.sh`
- `scripts/stop_mac.sh`
- `test/docker-compose.test.yml`
- `.env.example`
