---
sidebar_position: 3
---

# Services Reference

Quick reference for all integrated services in Kosuke Template.

## Service Overview

| Service    | Purpose                        | Free Tier    | Dashboard                                          | Documentation                              |
| ---------- | ------------------------------ | ------------ | -------------------------------------------------- | ------------------------------------------ |
| **Clerk**  | Authentication & Organizations | 10k MAUs     | [dashboard.clerk.com](https://dashboard.clerk.com) | [clerk.com/docs](https://clerk.com/docs)   |
| **Polar**  | Billing & Subscriptions        | Sandbox mode | [polar.sh/dashboard](https://polar.sh/dashboard)   | [docs.polar.sh](https://docs.polar.sh)     |
| **Neon**   | PostgreSQL Database            | 3 GB         | [console.neon.tech](https://console.neon.tech)     | [neon.tech/docs](https://neon.tech/docs)   |
| **Vercel** | Application Hosting            | Unlimited    | [vercel.com](https://vercel.com)                   | [vercel.com/docs](https://vercel.com/docs) |
| **Resend** | Email Delivery                 | 3k emails/mo | [resend.com](https://resend.com)                   | [resend.com/docs](https://resend.com/docs) |
| **Sentry** | Error Monitoring               | 5k events/mo | [sentry.io](https://sentry.io)                     | [docs.sentry.io](https://docs.sentry.io)   |

---

## Clerk Authentication

### What It Does

Complete authentication solution with built-in support for organizations and teams. Provides user management, social login, email verification, and role-based access control.

### Key Features

- **Authentication Methods**: Email/password, magic links, Google, GitHub, and more
- **Organizations**: Multi-tenant workspaces with customizable roles
- **User Management**: Dashboard for managing users, sessions, and organizations
- **Webhooks**: Real-time events for user, organization, and membership changes
- **Session Management**: Secure HTTP-only cookies with automatic refresh

### When You Need It

- User sign-up and sign-in flows
- Organization creation and management
- Team member invitations
- Role-based permissions
- User profile management

---

## Polar Billing

### What It Does

Modern billing platform designed for developers. Handles subscription management, payment processing, and provides sandbox mode for testing without real charges.

### Key Features

- **Subscription Tiers**: Free, Pro ($20/mo), Business ($200/mo)
- **Sandbox Mode**: Test billing flows without real payments
- **Webhooks**: Real-time subscription status updates
- **Checkout**: Hosted checkout pages with automatic receipts
- **Customer Portal**: Users can manage their own subscriptions

### When You Need It

- Creating subscription checkout flows
- Checking user's subscription tier
- Handling subscription upgrades/downgrades
- Managing billing for organizations
- Testing payment flows

---

## Neon Database

### What It Does

Serverless PostgreSQL database with automatic scaling, connection pooling, and database branching for pull requests.

### Key Features

- **Serverless PostgreSQL**: Auto-scaling, pay-per-use compute
- **Database Branching**: Automatic preview databases for each PR
- **Connection Pooling**: Built-in PgBouncer for efficient connections
- **Point-in-Time Restore**: 7-day restore window on free tier
- **Instant Databases**: Create databases in seconds

### When You Need It

- Storing application data
- User and organization information
- Subscription records
- Any relational data
- Testing database changes in preview environments

---

## Vercel Platform

### What It Does

Cloud platform optimized for Next.js applications. Provides hosting, automatic deployments, preview URLs, serverless functions, and edge network delivery.

### Key Features

- **Automatic Deployments**: Deploy on every git push
- **Preview Deployments**: Unique URL for every pull request
- **Edge Network**: Global CDN for fast content delivery
- **Serverless Functions**: API routes scale automatically
- **Blob Storage**: File storage with CDN
- **Cron Jobs**: Scheduled tasks (subscription sync)

### When You Need It

- Deploying your application
- Managing environment variables
- Viewing deployment logs
- Storing uploaded files
- Scheduling background jobs

---

## Resend Email

### What It Does

Email delivery service designed for transactional emails. Provides high deliverability, simple API, and React Email integration for building templates.

### Key Features

- **React Email Templates**: Build emails with React components
- **High Deliverability**: Optimized for transactional email
- **Email Analytics**: Track delivery, opens, and bounces
- **Domain Verification**: Use your own sending domain
- **Development Mode**: Test with `onboarding@resend.dev`

### When You Need It

- Sending welcome emails
- Subscription confirmations
- Team invitations
- Notification emails
- Password resets

---

## Sentry Monitoring

### What It Does

Error tracking and performance monitoring platform. Captures errors, tracks performance, records user sessions, and provides debugging tools.

### Key Features

- **Error Tracking**: Client, server, and API errors
- **Performance Monitoring**: Page loads, API calls, database queries
- **Session Replay**: Video-like replay of user sessions
- **Release Tracking**: Monitor each deployment
- **Source Maps**: See original TypeScript in stack traces

### When You Need It

- Debugging production errors
- Monitoring application health
- Tracking performance issues
- Understanding user behavior during errors
- Release health monitoring

---

## Service Limits & Pricing

### Free Tiers Summary

| Service    | Free Tier                  | What's Included                           |
| ---------- | -------------------------- | ----------------------------------------- |
| **Clerk**  | 10,000 MAUs                | Unlimited organizations, all auth methods |
| **Polar**  | Sandbox                    | Unlimited test subscriptions              |
| **Neon**   | 3 GB storage               | Unlimited branches, 1 project             |
| **Vercel** | Hobby plan                 | Unlimited deployments, 100 GB bandwidth   |
| **Resend** | 3,000 emails/mo            | All features, domain verification         |
| **Sentry** | 5k errors, 10k performance | Session replay, source maps               |

### When to Upgrade

- **Clerk**: When monthly active users exceed 10,000
- **Polar**: When ready for real payments (switch to production)
- **Neon**: When storage exceeds 3 GB or need dedicated compute
- **Vercel**: When bandwidth > 100 GB or need team features
- **Resend**: When sending > 3,000 emails/month
- **Sentry**: When exceeding error or performance event limits

---

## Quick Links

### Dashboards

- [Vercel Dashboard](https://vercel.com)
- [Neon Console](https://console.neon.tech)
- [Clerk Dashboard](https://dashboard.clerk.com)
- [Polar Sandbox](https://sandbox.polar.sh/dashboard)
- [Polar Production](https://polar.sh/dashboard)
- [Resend Dashboard](https://resend.com)
- [Sentry Dashboard](https://sentry.io)

### Status Pages

- [Vercel Status](https://vercel-status.com)
- [Clerk Status](https://status.clerk.com)
- [Neon Status](https://neonstatus.com)
- [Sentry Status](https://status.sentry.io)

---

## Next Steps

Ready to deploy? Follow the complete deployment guide:

👉 **[Deployment Guide](../deployment/full-deployment-guide)**
