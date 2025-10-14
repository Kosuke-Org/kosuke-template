---
sidebar_position: 3
---

# Neon Database

Complete reference for Neon PostgreSQL database.

## Overview

Neon provides serverless PostgreSQL with automatic branching for Kosuke Template.

## Dashboard

Access at [console.neon.tech](https://console.neon.tech)

## Configuration

### Connection String

Automatically added by Vercel:

```bash
POSTGRES_URL=postgresql://user:password@host.neon.tech/database?sslmode=require
```

### Connection Types

Vercel adds multiple connection strings:

- `POSTGRES_URL`: Pooled connection (use this)
- `POSTGRES_URL_NON_POOLING`: Direct connection
- `POSTGRES_PRISMA_URL`: For Prisma (unused)
- `POSTGRES_URL_NO_SSL`: Without SSL (not recommended)

## Features

### Serverless

- Automatic scaling
- Scale to zero
- Pay per use
- No infrastructure management

### Branching

- Create database branches
- Copy-on-write storage
- Instant branch creation
- Automatic preview branches

### Connection Pooling

- Built-in pooling
- Handles concurrent connections
- No configuration needed
- Optimal for serverless

## Database Management

### Projects

Organize databases by project:

- Development project
- Production project
- Staging project

### Branches

Main branch + feature branches:

```
main (production)
├── feature-1 (PR #123)
├── feature-2 (PR #124)
└── staging
```

### Compute

Adjust compute resources:

- **Shared**: Free tier
- **Dedicated**: Better performance
- **Auto-scaling**: Scale with load

## Monitoring

### Metrics

View in Neon dashboard:

**Compute**:

- CPU usage
- Memory usage
- Active connections

**Storage**:

- Database size
- Branch storage
- Growth trends

**Queries**:

- Query performance
- Slow queries
- Query count

### Query Insights

Analyze queries:

- Execution time
- Frequency
- Resource usage

Optimize slow queries with indexes.

## Backups

### Automatic

Neon provides:

- Continuous backups
- Point-in-time restore (7 days free tier)
- Instant recovery

### Manual Backup

```bash
pg_dump $POSTGRES_URL > backup.sql
```

### Restore

```bash
psql $POSTGRES_URL < backup.sql
```

## Scaling

### Vertical Scaling

Increase compute:

1. Go to project settings
2. Select compute size
3. Save changes
4. Automatic migration

### Storage Scaling

Automatic:

- Storage grows as needed
- Pay for what you use
- No limits on paid plans

## Security

### SSL/TLS

Always use SSL:

```
?sslmode=require
```

Already configured in connection string.

### IP Allowlist

Configure in settings:

- Restrict access
- Allow specific IPs
- Enhanced security

### Role Management

PostgreSQL roles:

- Owner role (full access)
- Read-only roles
- Custom roles

## Connection Pooling

### PgBouncer

Neon includes PgBouncer:

- Transaction pooling
- Handles 10,000+ connections
- No configuration needed

### Connection Limits

- Pooled: Virtually unlimited
- Direct: Limited per plan

## Performance

### Optimization

1. **Add indexes** for frequent queries
2. **Use pooled connection** (default)
3. **Limit query results**
4. **Use prepared statements** (Drizzle does this)

### Query Analysis

```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';
```

## Limits & Pricing

### Free Tier

- 3 GB storage
- Shared compute
- 7-day point-in-time restore
- Unlimited branches

### Launch ($19/month)

- 10 GB storage
- Dedicated compute
- 30-day restore

### Scale ($69/month)

- 50 GB storage
- Larger compute
- Priority support

## Resources

- [Neon Documentation](https://neon.tech/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Connection Guide](https://neon.tech/docs/connect)
