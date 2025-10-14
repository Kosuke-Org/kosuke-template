---
sidebar_position: 2
---

# Troubleshooting

Common issues and solutions for Kosuke Template.

## Development Issues

### Port Already in Use

**Problem**: `Error: Port 3000 is already in use`

**Solution**:

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 pnpm run dev
```

### Database Connection Failed

**Problem**: Cannot connect to PostgreSQL

**Solutions**:

```bash
# Check if Docker is running
docker ps

# Restart PostgreSQL
docker-compose restart postgres

# View logs
docker-compose logs postgres

# Recreate container
docker-compose down
docker-compose up -d postgres
```

### Module Not Found

**Problem**: `Error: Cannot find module '@/...'`

**Solutions**:

```bash
# Clear and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Clear Next.js cache
rm -rf .next
pnpm run dev
```

## Build Issues

### TypeScript Errors

**Problem**: Build fails with TypeScript errors

**Solutions**:

```bash
# Check for type errors
pnpm run typecheck

# Common fixes:
# 1. Update types: pnpm install @types/node@latest
# 2. Clear cache: rm -rf .next
# 3. Restart TS server in your IDE
```

### Environment Variables Missing

**Problem**: `Error: Missing environment variable: [NAME]`

**Solutions**:

1. Check `.env` file exists
2. Verify variable name matches exactly
3. Restart dev server after adding variables
4. In Vercel, check Settings → Environment Variables

## Deployment Issues

### Vercel Build Fails

**Problem**: Deployment fails on Vercel

**Solutions**:

1. Check build logs in Vercel dashboard
2. Verify all environment variables are set
3. Test build locally: `pnpm run build`
4. Check for linting errors: `pnpm run lint`

### Database Migration Fails

**Problem**: `prebuild` script fails during deployment

**Solutions**:

1. Check if `POSTGRES_URL` is set correctly
2. Verify migration files in `lib/db/migrations/`
3. Test locally: `pnpm run db:migrate`
4. Check Vercel build logs for specific error

## Webhook Issues

### Clerk Webhook Not Receiving Events

**Problem**: User data not syncing from Clerk

**Solutions**:

1. Verify webhook URL is correct:
   ```
   https://your-domain.vercel.app/api/clerk/webhook
   ```
2. Check `CLERK_WEBHOOK_SECRET` matches Clerk dashboard
3. View webhook logs in Clerk dashboard
4. Test webhook with Clerk's webhook tester

### Polar Webhook Fails

**Problem**: Subscriptions not updating

**Solutions**:

1. Verify webhook URL:
   ```
   https://your-domain.vercel.app/api/billing/webhook
   ```
2. Check `POLAR_WEBHOOK_SECRET` is correct
3. View webhook logs in Polar dashboard
4. Ensure webhook events are selected

## Authentication Issues

### Can't Sign In

**Problem**: Sign-in page not working

**Solutions**:

1. Check Clerk API keys are correct
2. Verify `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` starts with `pk_`
3. Clear browser cookies
4. Try incognito mode
5. Check Clerk dashboard for service status

### Organization Not Loading

**Problem**: Organization context missing

**Solutions**:

1. Verify Organizations are enabled in Clerk dashboard
2. Check user is member of organization
3. Clear session and sign in again
4. Check webhook sync completed

## Email Issues

### Emails Not Sending

**Problem**: Welcome emails not received

**Solutions**:

1. Check `RESEND_API_KEY` is correct
2. Verify sender email domain
3. Check Resend dashboard for delivery logs
4. Verify email service is called (check logs)
5. Test with Resend API playground

### Email Preview Not Working

**Problem**: `pnpm run email:dev` fails

**Solutions**:

```bash
# Reinstall React Email
pnpm install react-email@latest

# Clear cache
rm -rf .next
pnpm run email:dev
```

## Database Issues

### Migrations Out of Sync

**Problem**: Migration version mismatch

**Solutions**:

```bash
# Check current migrations
ls lib/db/migrations/

# Reset local database (dev only)
docker-compose down -v
docker-compose up -d postgres
pnpm run db:migrate
```

### Drizzle Studio Won't Open

**Problem**: `pnpm run db:studio` fails

**Solutions**:

1. Check database is running
2. Verify `POSTGRES_URL` in `.env`
3. Try different port: `PORT=3333 pnpm run db:studio`
4. Check for Node.js version (need 20+)

## Performance Issues

### Slow Build Times

**Solutions**:

```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules
rm -rf node_modules
pnpm install

# Disable TypeScript checking during dev (not recommended)
# Add to next.config.ts:
typescript: {
  ignoreBuildErrors: true, // Dev only!
}
```

### Slow Database Queries

**Solutions**:

1. Add indexes to frequently queried columns
2. Use `EXPLAIN ANALYZE` to debug slow queries
3. Enable connection pooling (Neon does this automatically)
4. Check for N+1 query problems

## Common Error Messages

### "Hydration failed"

**Cause**: Server and client HTML mismatch

**Solutions**:

- Check for client-only code in Server Components
- Ensure `'use client'` directive where needed
- Clear `.next` cache

### "Failed to fetch"

**Cause**: API endpoint not accessible

**Solutions**:

- Check API route exists
- Verify authentication is correct
- Check network tab for actual error
- Ensure CORS is configured

### "Insufficient permissions"

**Cause**: Missing required role/permission

**Solutions**:

- Check user's organization role
- Verify permission checks in code
- Ensure user is authenticated
- Check organization membership

## Getting Help

If you're still stuck:

1. **Check error logs** in Sentry dashboard
2. **Review service dashboards** (Clerk, Polar, Resend)
3. **Search GitHub issues** for similar problems
4. **Open new issue** with:
   - Error message
   - Steps to reproduce
   - Environment (local vs production)
   - Relevant logs

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Troubleshooting](https://nextjs.org/docs/messages)
- [Clerk Debugging Guide](https://clerk.com/docs/debugging)
- [Drizzle ORM Docs](https://orm.drizzle.team)
