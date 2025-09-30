from datetime import datetime

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health_endpoint() -> None:
    """Test the health check endpoint returns correct response."""
    response = client.get("/health")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "engine-service"
    assert "timestamp" in data

    # Verify timestamp is valid ISO format
    timestamp = datetime.fromisoformat(data["timestamp"])
    assert isinstance(timestamp, datetime)


def test_root_endpoint() -> None:
    """Test the root endpoint returns API information."""
    response = client.get("/")
    assert response.status_code == 200

    data = response.json()
    assert data["message"] == "Engine Service API"
    assert data["version"] == "1.0.0"
    assert "endpoints" in data
    assert data["endpoints"]["health"] == "/health"
    assert data["endpoints"]["docs"] == "/docs"


def test_docs_endpoint_exists() -> None:
    """Test that the OpenAPI docs endpoint is available."""
    response = client.get("/docs")
    assert response.status_code == 200


def test_openapi_schema() -> None:
    """Test that the OpenAPI schema is available."""
    response = client.get("/openapi.json")
    assert response.status_code == 200

    schema = response.json()
    assert schema["info"]["title"] == "Engine Service"
    assert schema["info"]["version"] == "1.0.0"
