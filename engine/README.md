# Engine Service

A lightweight FastAPI microservice for the Kosuke Template.

## Overview

This service provides a simple health check endpoint and can be extended with additional business logic as needed. It's designed to be deployed on Fly.io for global edge distribution with low latency.

## Features

- **Health Monitoring**: Built-in health checks for monitoring and orchestration
- **FastAPI**: Modern, fast Python web framework
- **UV Dependency Management**: Fast, reliable Python package management
- **Auto Scaling**: Scales to zero when not in use on Fly.io
- **Docker Support**: Containerized for easy deployment
- **Sentry Integration**: Error tracking and performance monitoring

## File Structure

```
engine/
├── main.py              # FastAPI application with endpoints
├── models.py            # Pydantic models for request/response validation
├── pyproject.toml       # UV project configuration and dependencies
├── Dockerfile           # Container configuration for Fly.io
├── fly.toml            # Fly.io deployment configuration
└── README.md           # This file
```

## API Endpoints

### GET /health

Health check endpoint for monitoring.

**Response:**

```json
{
  "status": "healthy",
  "service": "engine-service",
  "timestamp": "2025-09-30T10:00:00.000000"
}
```

### GET /

Root endpoint with API information.

**Response:**

```json
{
  "message": "Engine Service API",
  "version": "1.0.0",
  "endpoints": {
    "health": "/health",
    "docs": "/docs"
  }
}
```

### GET /docs

Interactive API documentation (Swagger UI).

## Development Setup

### Prerequisites

- Python 3.12+
- UV (https://github.com/astral-sh/uv)
- Git

### Local Development

1. **Install UV:**

   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```

2. **Create virtual environment and install dependencies:**

   ```bash
   cd engine
   uv venv
   source .venv/bin/activate  # Linux/Mac
   # or
   .venv\Scripts\activate     # Windows

   uv pip install -e ".[dev]"
   ```

3. **Run the application:**

   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

   The API will be available at: http://localhost:8000
   API docs at: http://localhost:8000/docs

4. **Run tests:**
   ```bash
   pytest
   ```

### Code Quality

This project uses several tools to maintain code quality:

- **Ruff**: Fast Python linter and formatter
- **MyPy**: Static type checking
- **Pytest**: Testing framework with coverage

#### Manual Code Quality Checks

```bash
# Individual tools (from engine/ directory)
ruff check .                    # Linting
ruff format .                   # Formatting
mypy .                         # Type checking
pytest --cov=. --cov-report=html  # Tests with coverage
```

### Git Hooks Integration

The Python code quality checks are integrated with the main project's Husky hooks. When you commit files in the `engine/` directory, the hooks will automatically:

- Run ruff linting and formatting
- Perform mypy type checking

The hooks are intelligent and only run Python checks when Python files are being committed, and only run Next.js checks when TypeScript/JavaScript files are being committed.

To skip hooks temporarily (not recommended):

```bash
git commit -m "message" --no-verify
```

### Test API

```bash
curl http://localhost:8000/health

curl http://localhost:8000/
```

## Docker Development

Build and run the Docker container locally:

```bash
docker build -t engine-service .
docker run -p 8000:8000 engine-service
```

Or use Docker Compose from the root directory:

```bash
docker compose up engine
```

## Deployment

Deploy to Fly.io:

```bash
fly deploy
```

Check deployment health:

```bash
curl https://engine-service.fly.dev/health
```

Quick deploy:

```bash
fly launch
fly secrets set SENTRY_DSN=<your-sentry-dsn>
fly secrets set FRONTEND_URL=https://your-app.vercel.app
fly deploy
```

## Performance

- **Response Time**: <50ms for health checks
- **Throughput**: 1000+ requests/second
- **Memory**: 128MB (sufficient for health checks)
- **Auto-scale**: To zero when idle
- **Cold Start**: ~2-3 seconds

## Environment Variables

```bash
PORT=8000                    # Optional, defaults to 8000
SENTRY_DSN=<your-dsn>        # Required for error tracking
ENVIRONMENT=development      # development, staging, or production
```

## Future Enhancements

- **Authentication**: API key validation
- **Monitoring**: Detailed metrics and alerting
- **Additional Endpoints**: Business logic specific to your use case
