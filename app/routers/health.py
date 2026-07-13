"""Health check endpoint."""

from __future__ import annotations

import os
from fastapi import APIRouter
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    data_source: str


router = APIRouter(tags=["system"])


@router.get("/api/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Return the health status of the API and which data source is active."""
    api_key = os.environ.get("MASSIVE_API_KEY", "").strip()
    data_source = "massive" if api_key else "simulator"
    return HealthResponse(status="ok", data_source=data_source)
