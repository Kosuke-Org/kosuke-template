import os
from datetime import UTC
from datetime import datetime

import sentry_sdk
from dotenv import load_dotenv
from fastapi import FastAPI
from sentry_sdk.integrations.fastapi import FastApiIntegration
from fastapi import HTTPException

from models import CalculateRequest
from models import CalculateResponse
from models import HealthResponse
from src.arithmetic_example import Operation
from src.arithmetic_example import calculate

load_dotenv()

# Initialize Sentry with FastAPI integration
sentry_dsn = os.getenv("SENTRY_DSN")
if sentry_dsn:
    sentry_sdk.init(
        dsn=sentry_dsn,
        environment=os.getenv("ENVIRONMENT", "development"),
        traces_sample_rate=0.1,
        profiles_sample_rate=0.1,
        enable_tracing=True,
        integrations=[
            FastApiIntegration(
                transaction_style="endpoint",
            ),
        ],
    )

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


@app.post("/calculate", response_model=CalculateResponse)
async def calculate_endpoint(payload: CalculateRequest) -> CalculateResponse:
    """Perform a simple arithmetic operation using the engine module.

    This is an example to illustrate how the engine can handle more complex operations"""
    try:
        op = Operation(payload.operation)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid operation") from exc

    try:
        result = calculate(payload.a, payload.b, op)
    except ZeroDivisionError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return CalculateResponse(result=result.value, operation=op.value)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)  # noqa: S104
