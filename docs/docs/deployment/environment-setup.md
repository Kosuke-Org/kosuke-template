---
sidebar_position: 3
---

# Environment Setup

Managing environment configurations across development, preview, and production.

## Environments

### Development (Local)

- Database: Docker PostgreSQL on localhost
- URLs: `http://localhost:3000`
- Services: Sandbox/development credentials
- Purpose: Local development

### Preview (Vercel)

- Database: Neon preview branch
- URLs: `https://project-git-branch.vercel.app`
- Services: Same as production
- Purpose: Test PRs before merge

### Production (Vercel)

- Database: Neon production
- URLs: `https://yourdomain.com`
- Services: Production credentials
- Purpose: Live application

## Environment Variables per Environment

### Development (.env)

```bash
POSTGRES_URL=postgres://postgres:postgres@localhost:54321/postgres
NEXT_PUBLIC_APP_URL=http://localhost:3000
POLAR_SUCCESS_URL=http://localhost:3000/billing/success?checkout_id={CHECKOUT_ID}
```

### Production (Vercel)

```bash
POSTGRES_URL=postgresql://...@neon.tech/...  # Auto-set by Neon
NEXT_PUBLIC_APP_URL=https://yourdomain.com
POLAR_SUCCESS_URL=https://yourdomain.com/billing/success?checkout_id={CHECKOUT_ID}
```

## Vercel Environment Selection

When adding variables in Vercel, select:

- ✅ **Production**: Main branch deployments
- ✅ **Preview**: PR and branch deployments
- ✅ **Development**: Local development (pulled with Vercel CLI)

## Environment-Specific Configuration

### API URLs

```typescript
const apiUrl =
  process.env.NODE_ENV === 'production'
    ? 'https://api.yourdomain.com'
    : 'http://localhost:3000/api';
```

### Feature Flags

```typescript
const enableBeta = process.env.NODE_ENV === 'development';

if (enableBeta) {
  // Show beta features
}
```

## Database per Environment

| Environment | Database                            |
| ----------- | ----------------------------------- |
| Development | Docker PostgreSQL (localhost:54321) |
| Preview     | Neon branch (automatic)             |
| Production  | Neon main branch                    |

## Testing Environments

### Local Testing

```bash
# Start local environment
docker-compose up -d
pnpm run dev
```

### Preview Testing

1. Create PR
2. Vercel creates preview
3. Test on preview URL
4. Neon creates database branch
5. Changes isolated from production

### Production Testing

Use staging environment if needed:

1. Create staging branch
2. Deploy to separate Vercel project
3. Use staging database
4. Test before merging to main

## Best Practices

1. **Never use production data in development**
2. **Different API keys per environment**
3. **Test migrations on preview before production**
4. **Use environment variables for all configuration**
5. **Document environment-specific behavior**

## Next Steps

Explore Neon preview branches:

👉 **[Neon Preview Branches](./neon-preview-branches)**
