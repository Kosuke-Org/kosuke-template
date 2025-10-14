---
sidebar_position: 1
---

# Production Checklist

Complete checklist before launching your Kosuke Template app to production.

## Pre-Launch Checklist

### 🔐 Authentication

- [ ] Transition Clerk to production credentials
- [ ] Verify custom domain in Clerk
- [ ] Configure production OAuth providers
- [ ] Test sign-up/sign-in flows
- [ ] Enable MFA (optional)

### 💳 Billing

- [ ] Switch Polar from sandbox to production
- [ ] Create production products
- [ ] Generate production API token
- [ ] Update webhook URLs to production domain
- [ ] Test checkout flow with real card

### 📧 Email

- [ ] Verify custom domain in Resend
- [ ] Configure SPF/DKIM/DMARC records
- [ ] Test email deliverability
- [ ] Update sender email address
- [ ] Test all email templates

### 🗄️ Database

- [ ] Review database schema
- [ ] Test migrations
- [ ] Set up backups
- [ ] Configure connection pooling
- [ ] Plan scaling strategy

### 🌐 Domain & SSL

- [ ] Add custom domain in Vercel
- [ ] Configure DNS records
- [ ] Verify SSL certificate
- [ ] Test HTTPS redirect
- [ ] Update all environment variables

### 🔒 Security

- [ ] Rotate all API keys
- [ ] Use production credentials only
- [ ] Enable rate limiting
- [ ] Review CORS settings
- [ ] Audit webhook secrets

### 📊 Monitoring

- [ ] Configure Sentry alerts
- [ ] Set up error notifications
- [ ] Monitor performance metrics
- [ ] Enable session replay
- [ ] Review sample rates

### ⚙️ Environment Variables

- [ ] Update `NEXT_PUBLIC_APP_URL`
- [ ] Set `NODE_ENV=production`
- [ ] Verify all API keys are production
- [ ] Generate new `CRON_SECRET`
- [ ] Remove development variables

### 🧪 Testing

- [ ] Run full test suite
- [ ] Test all features
- [ ] Verify webhook endpoints
- [ ] Test payment flows
- [ ] Check error handling

### 📄 Legal & Compliance

- [ ] Add Terms of Service
- [ ] Add Privacy Policy
- [ ] Configure cookie consent (if needed)
- [ ] Add GDPR compliance (if EU users)
- [ ] Review data retention policies

## Post-Launch

### Immediate

- [ ] Monitor error rates in Sentry
- [ ] Watch deployment logs
- [ ] Test critical user flows
- [ ] Monitor performance
- [ ] Check webhook delivery

### First Week

- [ ] Review user feedback
- [ ] Monitor subscription conversions
- [ ] Check email deliverability
- [ ] Review error patterns
- [ ] Optimize performance issues

### Ongoing

- [ ] Regular security audits
- [ ] Update dependencies
- [ ] Monitor costs
- [ ] Review analytics
- [ ] Backup database

## Production Configuration Guides

Follow these guides to transition each service to production:

- [Polar Production Setup](./polar-production)
- [Clerk Production Setup](./clerk-production)
- [Custom Domains](./custom-domains)
- [Security Best Practices](./security)

## Support

Need help with production setup? Check:

- [Troubleshooting](../reference/troubleshooting)
- GitHub Issues
- Service-specific documentation
