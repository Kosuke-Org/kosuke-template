---
sidebar_position: 1
---

# Prerequisites

Before you begin setting up Kosuke Template, you'll need to create accounts with several services. This page lists everything you need to get started.

## Required Accounts

You'll create these accounts during the setup process:

### 1. GitHub Account

- **Purpose**: Fork the Kosuke Template repository
- **Sign up**: [github.com](https://github.com)
- **Free tier**: Yes
- **What you'll do**: Fork the template repository to your account

### 2. Vercel Account

- **Purpose**: Host your application, manage deployments
- **Sign up**: [vercel.com](https://vercel.com)
- **Free tier**: Yes (Hobby plan)
- **What you'll do**: Import your GitHub repository, set up deployments

### 3. Neon Account

- **Purpose**: PostgreSQL database hosting
- **Sign up**: Through Vercel integration
- **Free tier**: Yes
- **What you'll do**: Create database, enable automatic preview branches

### 4. Polar Account

- **Purpose**: Billing and subscription management
- **Sign up**: [polar.sh](https://polar.sh)
- **Sandbox**: Available for testing
- **What you'll do**: Create organization, set up products, configure webhooks

### 5. Clerk Account

- **Purpose**: Authentication and user management
- **Sign up**: [clerk.com](https://clerk.com)
- **Free tier**: Yes (up to 10,000 MAUs)
- **What you'll do**: Create application, enable organizations, set up webhooks

### 6. Resend Account

- **Purpose**: Email delivery service
- **Sign up**: [resend.com](https://resend.com)
- **Free tier**: Yes (100 emails/day)
- **What you'll do**: Get API key, configure sender email

### 7. Sentry Account

- **Purpose**: Error monitoring and performance tracking
- **Sign up**: [sentry.io](https://sentry.io)
- **Free tier**: Yes (5k events/month)
- **What you'll do**: Create project, get DSN

## Required Tools

Install these tools on your local machine:

### Node.js & pnpm

```bash
# Install Node.js 20+ from https://nodejs.org
# Verify installation
node --version  # Should be v20.0.0 or higher

# Install pnpm
npm install -g pnpm

# Verify pnpm installation
pnpm --version
```

### Docker (for local database)

```bash
# Install Docker Desktop from https://www.docker.com/products/docker-desktop
# Verify installation
docker --version
docker-compose --version
```

### Git

```bash
# Install Git from https://git-scm.com
# Verify installation
git --version
```

## Optional Tools

These tools enhance your development experience:

### VS Code Extensions

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript + JavaScript
- Drizzle ORM

### Database Tools

- **Drizzle Studio**: Built-in (`pnpm run db:studio`)
- **TablePlus**: Visual database client
- **pgAdmin**: PostgreSQL administration

## Estimated Setup Time

| Task                  | Time              |
| --------------------- | ----------------- |
| Account creation      | 15-20 minutes     |
| Service configuration | 30-45 minutes     |
| Environment setup     | 10-15 minutes     |
| Local development     | 5-10 minutes      |
| **Total**             | **60-90 minutes** |

## Important Notes

### Free Tier Limits

All services offer generous free tiers suitable for development and small projects:

- **Vercel**: Unlimited personal projects
- **Neon**: 3 GB storage, shared compute
- **Clerk**: 10,000 monthly active users
- **Resend**: 100 emails/day (3,000/month)
- **Sentry**: 5,000 events/month
- **Polar**: No limits in sandbox mode

### Sandbox vs Production

- Start with **Polar sandbox** for testing billing
- Use **development** credentials from Clerk and Sentry
- Transition to production when ready to launch
- See [Production Guide](../production/checklist) for migration steps

### Data Privacy

- All services are GDPR compliant
- User data stored securely in PostgreSQL
- Payment processing handled by Polar (PCI compliant)
- Email delivery managed by Resend

## Next Steps

Once you have all accounts ready, proceed to:

👉 **[Step 1: Fork Repository](./01-github-fork.md)**

---

**Need help?** Check the [Troubleshooting](../reference/troubleshooting) guide or open an issue on GitHub.
