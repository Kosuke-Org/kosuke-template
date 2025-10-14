---
sidebar_position: 1
---

# Commands Reference

Complete reference of all pnpm scripts available in Kosuke Template.

## Development

```bash
# Start development server (http://localhost:3000)
pnpm run dev

# Start development server with email preview
pnpm run dev:email

# Build for production
pnpm run build

# Start production server
pnpm run start
```

## Database

```bash
# Generate migration from schema changes
pnpm run db:generate

# Run pending migrations
pnpm run db:migrate

# Run migrations in production (verbose)
pnpm run db:migrate:prod

# Push schema changes directly (dev only, no migrations)
pnpm run db:push

# Open Drizzle Studio (visual database browser)
pnpm run db:studio

# Seed database with initial data
pnpm run db:seed
```

## Email

```bash
# Start React Email preview server (port 3001)
pnpm run email:dev

# Export email templates to static HTML
pnpm run email:export
```

## Code Quality

```bash
# Run ESLint
pnpm run lint

# Run TypeScript type checking
pnpm run typecheck

# Format code with Prettier
pnpm run format

# Check code formatting
pnpm run format:check
```

## Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm run test:watch

# Generate coverage report
pnpm run test:coverage
```

## Shadcn UI

```bash
# Check for component updates
pnpm run shadcn:check

# Update all components
pnpm run shadcn:update

# Force update all components
pnpm run shadcn:force
```

## Docker

```bash
# Start all services
docker-compose up -d

# Start only PostgreSQL
docker-compose up -d postgres

# Stop all services
docker-compose down

# View logs
docker-compose logs -f
```

## Common Workflows

### Starting Development

```bash
# 1. Start database
docker-compose up -d postgres

# 2. Run migrations
pnpm run db:migrate

# 3. Start dev server
pnpm run dev
```

### Making Schema Changes

```bash
# 1. Edit lib/db/schema.ts
# 2. Generate migration
pnpm run db:generate

# 3. Review migration in lib/db/migrations/
# 4. Apply migration
pnpm run db:migrate
```

### Before Committing

```bash
# Run all checks
pnpm run lint
pnpm run typecheck
pnpm test
```

### Email Development

```bash
# Start both dev and email preview
pnpm run dev:email

# Then visit:
# - App: http://localhost:3000
# - Email: http://localhost:3001
```
