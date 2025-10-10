from pydantic import BaseModel
from pydantic import Field


class HealthResponse(BaseModel):
    status: str = Field(..., description="Service health status")
    service: str = Field(..., description="Service name")
    timestamp: str = Field(..., description="Response timestamp")


class CalculateRequest(BaseModel):
    a: float = Field(..., description="First operand")
    b: float = Field(..., description="Second operand")
    operation: str = Field(
        ..., description="Operation to perform: add | subtract | multiply | divide"
    )


class CalculateResponse(BaseModel):
    result: float = Field(..., description="Calculation result")
    operation: str = Field(..., description="Operation performed")
