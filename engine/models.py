from pydantic import BaseModel
from pydantic import Field


class HealthResponse(BaseModel):
    status: str = Field(..., description="Service health status")
    service: str = Field(..., description="Service name")
    timestamp: str = Field(..., description="Response timestamp")
