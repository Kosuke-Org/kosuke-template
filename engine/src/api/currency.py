"""Currency conversion API endpoints."""

from enum import Enum

from fastapi import APIRouter
from fastapi import HTTPException
from pydantic import BaseModel
from pydantic import Field


class ConvertRequest(BaseModel):
    """Request to convert currency."""

    amount: float = Field(..., description="Amount to convert", ge=0)
    from_currency: str = Field(..., description="Source currency code (USD, EUR, GBP, etc.)")
    to_currency: str = Field(..., description="Target currency code (USD, EUR, GBP, etc.)")


class ConvertResponse(BaseModel):
    """Response with converted currency amount."""

    converted_amount: float = Field(..., description="Converted amount")
    from_currency: str = Field(..., description="Source currency")
    to_currency: str = Field(..., description="Target currency")
    exchange_rate: float = Field(..., description="Exchange rate used")


router = APIRouter()


class Currency(str, Enum):
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"
    JPY = "JPY"
    CAD = "CAD"
    AUD = "AUD"
    CHF = "CHF"
    CNY = "CNY"


# Mock exchange rates
EXCHANGE_RATES = {
    "USD": 1.0,
    "EUR": 0.85,
    "GBP": 0.73,
    "JPY": 110.0,
    "CAD": 1.25,
    "AUD": 1.35,
    "CHF": 0.92,
    "CNY": 6.45,
}


def convert_currency(amount: float, from_currency: Currency, to_currency: Currency) -> float:
    """Convert currency amount from one currency to another.

    This is a mock implementation using hardcoded rates.
    In production, you'd fetch real-time rates from a financial API.
    """
    if amount < 0:
        msg = "Amount cannot be negative"
        raise ValueError(msg)

    if from_currency == to_currency:
        return amount

    # Convert to USD first, then to target currency
    usd_amount = amount / EXCHANGE_RATES[from_currency.value]
    converted_amount = usd_amount * EXCHANGE_RATES[to_currency.value]

    return round(converted_amount, 2)


@router.post("/convert", response_model=ConvertResponse)
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
        exchange_rate=round(exchange_rate, 4),
    )
