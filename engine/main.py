import os
from datetime import UTC
from datetime import datetime

import sentry_sdk
from dotenv import load_dotenv
from fastapi import FastAPI
from sentry_sdk.integrations.fastapi import FastApiIntegration
from fastapi import HTTPException

from models import ConvertRequest
from models import ConvertResponse
from models import HealthResponse
from src.currency_converter import EXCHANGE_RATES
from src.currency_converter import Currency
from src.currency_converter import convert_currency

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
        "endpoints": {"health": "/health", "convert": "/convert", "docs": "/docs"},
    }


@app.post("/convert", response_model=ConvertResponse)
async def convert_endpoint(payload: ConvertRequest) -> ConvertResponse:
    """Convert currency from one to another using the engine module.

    This is an example to illustrate how the engine can handle more complex operations"""
    try:
        from_curr = Currency(payload.from_currency.upper())
        to_curr = Currency(payload.to_currency.upper())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid currency code") from exc

    try:
        converted_amount = convert_currency(payload.amount, from_curr, to_curr)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    # Calculate exchange rate for display
    exchange_rate = EXCHANGE_RATES[to_curr.value] / EXCHANGE_RATES[from_curr.value]

    return ConvertResponse(
        converted_amount=converted_amount,
        from_currency=from_curr.value,
        to_currency=to_curr.value,
        exchange_rate=round(exchange_rate, 4)
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)  # noqa: S104
