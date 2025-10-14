---
sidebar_position: 4
---

# Neon Preview Branches

Automatic database branching for pull requests with Neon.

## What Are Preview Branches?

Neon creates isolated database copies for each pull request:

```
PR created → Neon branch created → Migrations run → Test changes
PR closed → Neon branch deleted → Cleanup
```

## How It Works

### 1. Create Pull Request

```bash
git checkout -b feature/new-feature
git push origin feature/new-feature
```

### 2. Automatic Branch Creation

When PR is created:

- Vercel detects PR
- Neon creates database branch
- Branch inherits production data
- Migrations run automatically

### 3. Isolated Testing

Each PR has:

- Own database
- Own Vercel preview URL
- Own environment variables
- Isolated from other PRs

### 4. Automatic Cleanup

When PR is closed:

- Neon deletes database branch
- Vercel removes preview deployment
- No manual cleanup needed

## Benefits

### Cost-Effective

- Copy-on-write storage
- Only pay for changed data
- Automatic cleanup
- No storage bloat

### Safe Testing

- Test migrations safely
- No risk to production
- Isolated environments
- Easy to reset

### Fast Workflow

- Instant branch creation
- Quick preview deployments
- Parallel testing
- No manual setup

## Configuration

Already configured in Kosuke Template:

### package.json

```json
{
  "scripts": {
    "prebuild": "pnpm run db:migrate"
  }
}
```

Runs migrations before every build.

### Vercel Integration

Neon integration handles:

- Branch creation
- Environment variables
- Connection pooling
- SSL configuration

## Testing Migrations

### Safe Migration Testing

1. Create PR with schema changes
2. Neon creates preview branch
3. Migrations run on preview
4. Test in preview environment
5. If successful, merge to main
6. If failed, fix and push again

### Migration Preview

```bash
# Local: Generate migration
pnpm run db:generate

# Create PR
git push origin feature/add-column

# Vercel preview: Automatic migration
# → Check preview URL to verify
# → Check Neon dashboard for branch

# Merge if successful
git checkout main
git merge feature/add-column
```

## Limitations

### Data Divergence

Preview branches don't sync with production:

- Created at PR creation time
- Don't receive production updates
- Recreate PR to get latest data

### Resource Limits

Free tier limits:

- Unlimited branches
- Shared compute
- 3 GB total storage

## Neon Dashboard

Monitor branches at [console.neon.tech](https://console.neon.tech):

### Branches Tab

- View all branches
- See preview branches
- Monitor storage usage
- Delete manually if needed

### Branch Details

For each branch:

- Connection string
- Creation time
- Storage used
- Associated deployment

## Manual Branch Management

### Create Branch Manually

```bash
# Using Neon CLI
neon branches create --name test-branch
```

### Connect to Branch

Each branch has unique connection string:

```bash
POSTGRES_URL=postgresql://...@branch.neon.tech/...
```

### Delete Branch

Branches delete automatically, but can delete manually:

```bash
neon branches delete test-branch
```

## Best Practices

1. **Test migrations in preview** before merging
2. **Keep PRs small** to avoid branch conflicts
3. **Close stale PRs** to free resources
4. **Monitor storage usage** in Neon dashboard
5. **Review branch activity** regularly

## Troubleshooting

### Preview Branch Not Created

- Check Neon integration in Vercel
- Verify Vercel has access to Neon
- Check Vercel build logs

### Migration Failed on Preview

- Check migration SQL for errors
- Test migration locally first
- Review Vercel build logs
- Fix and push again

### Branch Not Deleting

- Close PR properly
- Delete manually in Neon dashboard
- Check integration status

## Cost Optimization

### Free Tier

- Unlimited branches
- 3 GB total storage
- Shared compute

### Paid Plans

If you exceed free tier:

- **Launch**: $19/month (10 GB)
- **Scale**: $69/month (50 GB)
- **Business**: Custom pricing

## Next Steps

Explore service reference documentation:

👉 **[Services Reference](../getting-started/services)**
