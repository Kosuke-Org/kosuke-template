# Render Deployment

Deploy the entire Kosuke template to Render with a single command.

## Prerequisites

- Bun 1.3.1+ ([install](https://bun.sh))
- Node 20+
- Render account and API key

## Setup

```bash
cd deployment/render
bun install
cp .env.example .env
# Edit .env with your credentials
```

## Required Credentials

- **RENDER_API_KEY**: From Render dashboard (Account Settings → API Tokens)
- **RENDER_OWNER_ID**: Team ID from Render dashboard URL
- **GIT_REPO**: GitHub repository URL (e.g., github.com/user/kosuke-template)
- All service secrets:
  - Clerk (publishable + secret key + webhook secret)
  - Stripe (secret + webhook secret + publishable key)
  - Resend API key
  - Vercel Blob token
  - Sentry token (optional)

## Deploy

```bash
bun run deploy
```

This will:

1. Create PostgreSQL database
2. Deploy Python engine service (stateless, no DB)
3. Deploy Next.js fullstack app (with DB + engine integration)
4. Configure all environment variables

## Production Deployment

```bash
bun run deploy:prod
```

Sets `NODE_ENV=production` during execution.

## What Gets Created

### Database

- PostgreSQL on `kosuke-postgres`
- Automatic connection string injection into Next.js app

### Engine Service

- Python 3.12 FastAPI microservice
- Port 8000
- Health checks enabled
- Stateless (no database)

### App Service

- Node 20 runtime
- Automatic migrations on deploy (`bun run db:migrate:prod`)
- All secrets from `.env` file

## Troubleshooting

**Missing env vars error**: Make sure all required variables are in `.env`

**Deploy fails**: Check Render dashboard logs for more details

**Service communication**: Engine URL is automatically configured as `https://kosuke-engine.onrender.com`
