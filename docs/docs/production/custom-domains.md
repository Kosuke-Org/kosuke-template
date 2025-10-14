---
sidebar_position: 4
---

# Custom Domains

Configure custom domains for your production Kosuke Template application.

## Add Domain to Vercel

### 1. Navigate to Domains

1. Go to your Vercel project dashboard
2. Click **Settings**
3. Click **Domains** in sidebar

### 2. Add Your Domain

1. Click **Add Domain**
2. Enter your domain: `yourdomain.com`
3. Click **Add**

### 3. Configure DNS

Vercel provides DNS configuration:

#### For Root Domain (yourdomain.com)

**A Record**:

```
Type: A
Name: @
Value: 76.76.21.21
```

#### For www Subdomain

**CNAME Record**:

```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### 4. Wait for Verification

- DNS propagation takes up to 48 hours
- Usually completes within 1-2 hours
- Vercel shows verification status

## SSL Certificate

Vercel automatically provisions SSL:

- Free SSL certificate via Let's Encrypt
- Automatic renewal
- HTTPS redirect enabled by default

## Update Environment Variables

After domain is verified, update:

```bash
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

In Vercel: Settings → Environment Variables

## Update Service URLs

Update webhook URLs in each service:

### Clerk Webhooks

```
https://yourdomain.com/api/clerk/webhook
```

### Polar Webhooks

```
https://yourdomain.com/api/billing/webhook
```

### Polar Success URL

```
https://yourdomain.com/billing/success?checkout_id={CHECKOUT_ID}
```

## Redeploy

Trigger new deployment to apply changes:

```bash
git commit --allow-empty -m "Update to custom domain"
git push
```

## Testing

1. Visit `https://yourdomain.com`
2. Verify SSL certificate
3. Test sign-in flow
4. Test billing checkout
5. Verify webhooks work

## Custom Email Domain

Match your email with your domain:

### In Resend

1. Go to Resend dashboard
2. Add domain: `yourdomain.com`
3. Configure DNS records (SPF, DKIM, DMARC)
4. Wait for verification
5. Update sender email:
   ```bash
   RESEND_FROM_EMAIL=hello@yourdomain.com
   ```

## Subdomain Configuration

Add subdomains if needed:

### App Subdomain

```
app.yourdomain.com → Vercel
```

### Docs Subdomain

```
docs.yourdomain.com → Docusaurus site
```

### API Subdomain

```
api.yourdomain.com → API routes
```

## Multiple Domains

Point multiple domains to same app:

1. Add each domain in Vercel
2. Configure DNS for each
3. Choose primary domain
4. Redirect others to primary

## Troubleshooting

### DNS Not Propagating

Check DNS with:

```bash
dig yourdomain.com
nslookup yourdomain.com
```

### SSL Certificate Errors

- Wait 24 hours for initial certificate
- Check DNS configuration
- Ensure HTTPS redirect enabled
- Clear browser cache

### Redirect Loop

- Check environment variables
- Verify middleware configuration
- Clear cookies

## Next Steps

Configure security settings:

👉 **[Security Best Practices](./security)**
