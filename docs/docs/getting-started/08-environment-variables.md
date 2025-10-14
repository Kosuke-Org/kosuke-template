---
sidebar_position: 9
---

# Step 8: Add Environment Variables

Configure all environment variables in Vercel to enable your deployment. This is the final step before your app goes live.

## Environment Variables Overview

You'll add credentials from all previous steps to Vercel:

| Service   | Variables                           | Count |
| --------- | ----------------------------------- | ----- |
| Clerk     | Authentication keys + webhook       | 6     |
| Polar     | Billing config + products + webhook | 6     |
| Sentry    | Error monitoring DSN                | 1     |
| Resend    | Email API + sender config           | 3-4   |
| App       | URLs + cron security                | 2     |
| **Total** | **18-19 variables**                 |       |

:::tip Database & Storage Already Set
`POSTGRES_URL` and `BLOB_READ_WRITE_TOKEN` were added automatically by Vercel when you set up Neon and Blob storage.
:::

## Add Variables to Vercel

### 1. Navigate to Environment Variables

1. Go to your Vercel dashboard: [vercel.com](https://vercel.com)
2. Click on your project
3. Go to **Settings** tab
4. Click **Environment Variables** in the sidebar

### 2. Add Each Variable

For each variable below:

1. Click **"Add New"**
2. **Key**: Enter the variable name
3. **Value**: Enter the value from previous steps
4. **Environments**: Select **Production**, **Preview**, and **Development**
5. Click **"Save"**

## Required Environment Variables

### Clerk Authentication

```bash
# API Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# URLs (use these exact values)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
```

### Polar Billing

```bash
# API Access
POLAR_ACCESS_TOKEN=polar_oat_...
POLAR_ENVIRONMENT=sandbox  # or 'production'
POLAR_ORGANIZATION_ID=your-org-slug

# Products
POLAR_PRO_PRODUCT_ID=prod_...
POLAR_BUSINESS_PRODUCT_ID=prod_...

# Webhook
POLAR_WEBHOOK_SECRET=polar_webhook_secret_...
```

### Sentry Monitoring

```bash
NEXT_PUBLIC_SENTRY_DSN=https://...@....ingest.sentry.io/...
```

### Resend Email

```bash
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_FROM_NAME=Your Project Name
# RESEND_REPLY_TO=support@yourdomain.com  # Optional
```

### Application Configuration

```bash
NEXT_PUBLIC_APP_URL=https://your-project-name.vercel.app
NODE_ENV=production
```

### Cron Job Security

Generate a secure token for the subscription sync cron job:

```bash
# Generate a random secure token
CRON_SECRET=<generate-random-token>
```

:::tip Generate CRON_SECRET
Use a password generator or run this in your terminal:

```bash
openssl rand -base64 32
```

This creates a secure random token.
:::

## Verify Configuration

### Check All Variables

After adding all variables, verify in Vercel:

1. Go to **Settings → Environment Variables**
2. Confirm all 18-19 variables are present
3. Check for typos in variable names
4. Ensure values don't have extra spaces

### Variable Checklist

- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- [ ] `CLERK_SECRET_KEY`
- [ ] `CLERK_WEBHOOK_SECRET`
- [ ] `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
- [ ] `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
- [ ] `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`
- [ ] `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`
- [ ] `POLAR_ACCESS_TOKEN`
- [ ] `POLAR_ENVIRONMENT`
- [ ] `POLAR_ORGANIZATION_ID`
- [ ] `POLAR_PRO_PRODUCT_ID`
- [ ] `POLAR_BUSINESS_PRODUCT_ID`
- [ ] `POLAR_WEBHOOK_SECRET`
- [ ] `NEXT_PUBLIC_SENTRY_DSN`
- [ ] `RESEND_API_KEY`
- [ ] `RESEND_FROM_EMAIL`
- [ ] `RESEND_FROM_NAME`
- [ ] `NEXT_PUBLIC_APP_URL`
- [ ] `CRON_SECRET`
- [ ] `POSTGRES_URL` (added by Neon)
- [ ] `BLOB_READ_WRITE_TOKEN` (added by Blob)

## Redeploy Your Application

### Trigger Deployment

1. Go to **Deployments** tab in Vercel
2. Click **⋯** (three dots) on latest deployment
3. Click **"Redeploy"**
4. Wait for deployment to complete

OR commit and push any change to your repository:

```bash
git commit --allow-empty -m "Trigger redeploy with env vars"
git push
```

### Verify Successful Deployment

After deployment completes:

1. Check deployment status: Should be ✅ **Ready**
2. Visit your app: `https://your-project-name.vercel.app`
3. Test sign-in/sign-up
4. Verify no console errors

## Environment Variable Security

### Best Practices

1. **Never commit to Git**: Environment variables should never be in code
2. **Use different values**: Use different keys for dev/prod
3. **Rotate regularly**: Change API keys periodically
4. **Limit permissions**: Use minimum required scopes
5. **Monitor usage**: Check for unauthorized access

### Public vs Private Variables

#### Public (NEXT*PUBLIC*\*)

- Included in client-side bundle
- Visible in browser
- Used for: API keys that need client access

#### Private (no prefix)

- Server-side only
- Never exposed to browser
- Used for: Sensitive credentials

## Troubleshooting

### Deployment Still Fails

Check build logs for:

```
Error: Missing environment variable: [VARIABLE_NAME]
```

Solution: Add the missing variable and redeploy.

### Webhooks Not Working

Verify webhook URLs use your correct domain:

```
https://your-actual-project-name.vercel.app/api/...
```

Not:

```
https://localhost:3000/api/...
```

### Variables Not Loading

1. Check variable names match exactly (case-sensitive)
2. Ensure selected all environments (Production, Preview, Development)
3. Redeploy after adding variables
4. Clear Vercel cache if needed

## Updating Variables

### Change a Variable

1. Go to **Settings → Environment Variables**
2. Find the variable
3. Click **⋯** → **Edit**
4. Update value
5. Redeploy application

### Remove a Variable

1. Click **⋯** → **Remove**
2. Confirm removal
3. Update code if needed
4. Redeploy application

## Next Steps

Your application is now fully configured and deployed! 🎉

Continue to local development setup:

👉 **[Step 9: Local Development Setup](./09-local-development.md)**

---

**Having issues?** Check the [Troubleshooting](../reference/troubleshooting) guide or [Vercel docs](https://vercel.com/docs).
