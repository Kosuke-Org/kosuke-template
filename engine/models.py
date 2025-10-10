from pydantic import BaseModel
from pydantic import Field


class HealthResponse(BaseModel):
    status: str = Field(..., description="Service health status")
    service: str = Field(..., description="Service name")
    timestamp: str = Field(..., description="Response timestamp")


class ConvertRequest(BaseModel):
    amount: float = Field(..., description="Amount to convert", ge=0)
    from_currency: str = Field(..., description="Source currency code (USD, EUR, GBP, etc.)")
    to_currency: str = Field(..., description="Target currency code (USD, EUR, GBP, etc.)")


class ConvertResponse(BaseModel):
    converted_amount: float = Field(..., description="Converted amount")
    from_currency: str = Field(..., description="Source currency")
    to_currency: str = Field(..., description="Target currency")
    exchange_rate: float = Field(..., description="Exchange rate used")
