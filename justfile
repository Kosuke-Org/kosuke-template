default:
    @just --list

run:
    @echo "Running all services with build..."
    @docker compose up --build -d

build:
    @echo "Building all containers..."
    @docker compose build

up:
    @echo "Starting up all containers..."
    @docker compose up -d --remove-orphans

down *args:
    @echo "Stopping all containers..."
    @docker compose down {{args}}

install:
    @echo "Installing dependencies locally..."
    @bun install --frozen-lockfile

db:generate:
    @echo "Generating database migration..."
    @bun run db:generate

db:migrate:
    @echo "Migrating database..."
    @docker exec kosuke_template_nextjs bun run db:migrate

db:reset:
    @echo "Dropping and recreating database..."
    @docker compose down -v
    @docker compose up -d
    @echo "Waiting for PostgreSQL to be ready..."
    @sleep 5
    @docker exec kosuke_template_nextjs bun run db:migrate
    @echo "Database reset complete!"

db:seed:
    @echo "Seeding database..."
    @docker exec kosuke_template_nextjs bun run db:seed

logs service="":
    @if [ -z "{{service}}" ]; then \
        docker compose logs -f; \
    else \
        docker compose logs -f {{service}}; \
    fi

email:dev:
    @echo "Starting email preview server..."
    @bun run email:dev

