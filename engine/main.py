from datetime import UTC
from datetime import datetime

from dotenv import load_dotenv
from fastapi import FastAPI

from models import HealthResponse

load_dotenv()

app = FastAPI(
    title="Engine Service", description="Core engine service for Kosuke Template", version="1.0.0"
)


@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Health check endpoint for monitoring."""
    return HealthResponse(
        status="healthy", service="engine-service", timestamp=datetime.now(UTC).isoformat()
    )


@app.get("/")
async def root() -> dict[str, str | dict[str, str]]:
    """Root endpoint with API information."""
    return {
        "message": "Engine Service API",
        "version": "1.0.0",
        "endpoints": {"health": "/health", "docs": "/docs"},
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)  # noqa: S104
