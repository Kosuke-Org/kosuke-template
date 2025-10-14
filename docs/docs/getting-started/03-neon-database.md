---
sidebar_position: 4
---

# Step 3: Set Up Neon Database

Set up your PostgreSQL database using Neon through Vercel's integration. This provides automatic database provisioning and preview branches for pull requests.

## Why Neon?

Neon offers:

- Serverless PostgreSQL
- Automatic branching for preview deployments
- Built-in connection pooling
- Generous free tier (3 GB storage)
- Zero-downtime migrations

## Integration via Vercel

The easiest way to set up Neon is through Vercel's marketplace integration.

### 1. Navigate to Storage

1. In your Vercel project dashboard, go to the **"Storage"** tab
2. Click **"Create Database"**

### 2. Select Neon

1. Choose **"Neon"** from the list of database providers
2. You'll see options to create a new Neon account or link an existing one

### 3. Account Setup

Choose one of these options:

#### Option A: Create New Neon Account

1. Click **"Create New Neon Account"**
2. Sign up using GitHub (recommended) or email
3. Complete the Neon onboarding
4. Authorize the Vercel integration

#### Option B: Link Existing Account

1. Click **"Link Existing Neon Account"**
2. Sign in to your Neon account
3. Authorize Vercel to access your Neon projects

### 4. Create Database

1. Choose your Neon project or create a new one
2. Select the region (choose closest to your users)
3. Name your database: `your-project-name-db`
4. Click **"Create"**

### 5. Automatic Configuration

Vercel automatically adds these environment variables:

```bash
POSTGRES_URL          # Primary connection string
POSTGRES_PRISMA_URL   # For Prisma (not used in Kosuke)
POSTGRES_URL_NO_SSL   # Without SSL
POSTGRES_URL_NON_POOLING # Direct connection
```

:::tip Only POSTGRES_URL is Needed
Kosuke Template uses Drizzle ORM and only needs `POSTGRES_URL`. The other variables are added automatically but won't be used.
:::

## Verify Database Connection

After setting up:

1. Go to **Settings → Environment Variables** in Vercel
2. Confirm `POSTGRES_URL` is present
3. It should look like:
   ```
   postgresql://user:password@region.neon.tech/dbname?sslmode=require
   ```

## Neon Preview Branches

One of Neon's best features is automatic database branching:

### How It Works

1. **Main branch** → Uses production database
2. **Pull request** → Creates database branch automatically
3. **Close PR** → Deletes database branch automatically

### Benefits

- Isolated testing environments
- No shared state between PRs
- Cost-effective (copy-on-write storage)
- Automatic cleanup

### Configuration

Database branching is configured in your `vercel.json`:

```json
{
  "git": {
    "deploymentEnabled": {
      "main": true
    }
  }
}
```

The template includes this configuration by default.

## Database Management

Access your Neon dashboard for advanced features:

### Neon Dashboard

Visit [console.neon.tech](https://console.neon.tech) to:

- View connection details
- Monitor query performance
- Manage database branches
- Configure connection pooling
- Set up replication

### Drizzle Studio

For local database management, use Drizzle Studio:

```bash
pnpm run db:studio
```

This opens a web interface to browse and edit database records.

## Connection Pooling

Neon includes connection pooling by default:

- **Pooled connection**: Use `POSTGRES_URL` (default)
- **Direct connection**: Use `POSTGRES_URL_NON_POOLING` (for migrations)

The template handles this automatically in migration scripts.

## Database Limits

Neon's free tier includes:

| Resource    | Limit               |
| ----------- | ------------------- |
| Storage     | 3 GB                |
| Branches    | Unlimited           |
| Compute     | Shared (autoscales) |
| Connections | Pooled              |

For production apps, consider upgrading to:

- **Launch**: $19/month (10 GB storage)
- **Scale**: $69/month (50 GB storage)

## Common Questions

### Do I need to run migrations manually?

No! Migrations run automatically via the `prebuild` script in `package.json`:

```json
{
  "scripts": {
    "prebuild": "pnpm run db:migrate"
  }
}
```

This runs before every deployment.

### What about local development?

For local development, use Docker Compose:

```bash
docker-compose up -d postgres
```

This creates a local PostgreSQL database on port 54321.

### Can I use a different database provider?

Yes, but you'll lose:

- Automatic preview branching
- Vercel integration benefits
- Zero-config setup

Any PostgreSQL-compatible database works with Drizzle ORM.

### How do I backup my database?

Neon includes:

- Point-in-time restore (7 days on free tier)
- Manual backups via `pg_dump`
- Branch-based backups

## Next Steps

With your database set up, continue to billing:

👉 **[Step 4: Configure Polar Billing](./04-polar-billing.md)**

---

**Having issues?** Check the [Troubleshooting](../reference/troubleshooting) guide or visit [Neon docs](https://neon.tech/docs).
