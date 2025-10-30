---
sidebar_position: 1
slug: /
---

# Welcome to Kosuke Template

**Kosuke Template** is a production-ready, multi-tenant SaaS starter built with modern web technologies. Get your SaaS application up and running in minutes, not months.

## 🚀 Tech Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **FastAPI** (Python) - Microservice backend on Fly.io for extensible business logic
- **Clerk** - Authentication with Organizations, teams, and roles
- **PostgreSQL** (Neon) + **Drizzle ORM** - Type-safe database with auto migrations
- **Stripe** - Subscription billing and payments
- **Resend** + **React Email** - Transactional emails with React components
- **Vercel Blob** - File storage with CDN
- **Sentry** - Error tracking and performance monitoring
- **Tailwind CSS** + **Shadcn UI** - Beautiful, accessible components
- **Vitest** - Fast testing with React Testing Library

## 🎯 Who Is This For?

- **Solo founders** who want to launch quickly
- **Development teams** building multi-tenant applications
- **Agencies** needing a robust starter for client projects
- **Engineers** who want to learn modern SaaS architecture

## Services Reference

Quick reference for all integrated services:

| Service    | Purpose                 | Free Tier    | Dashboard                                            |
| ---------- | ----------------------- | ------------ | ---------------------------------------------------- |
| **Clerk**  | Authentication & Orgs   | 10k MAUs     | [dashboard.clerk.com](https://dashboard.clerk.com)   |
| **Stripe** | Billing & Subscriptions | Test mode    | [dashboard.stripe.com](https://dashboard.stripe.com) |
| **Neon**   | PostgreSQL Database     | 3 GB         | [console.neon.tech](https://console.neon.tech)       |
| **Vercel** | Application Hosting     | Unlimited    | [vercel.com](https://vercel.com)                     |
| **Fly.io** | Microservice Hosting    | 3 VMs        | [fly.io/dashboard](https://fly.io/dashboard)         |
| **Resend** | Email Delivery          | 3k emails/mo | [resend.com](https://resend.com)                     |
| **Sentry** | Error Monitoring        | 5k events/mo | [sentry.io](https://sentry.io)                       |

### When to Upgrade

- **Clerk**: > 10,000 monthly active users
- **Stripe**: Ready for real payments (switch to live mode)
- **Neon**: > 3 GB storage or need dedicated compute
- **Vercel**: > 100 GB bandwidth or need team features
- **Fly.io**: Need more than 3 VMs or dedicated compute
- **Resend**: > 3,000 emails/month
- **Sentry**: Exceeding error or performance event limits

## Features

### Organizations & Teams

Complete multi-tenancy with Clerk Organizations:

- Create unlimited organizations with team invitations
- Admin and member roles with customizable permissions
- Automatic webhook sync to your database
- Organization-scoped data isolation
- Organization-level billing and subscriptions

### Subscription Management

Stripe billing integration with automated sync:

- Three tiers: Free, Pro ($20/mo), Business ($200/mo)
- Real-time webhook updates + 6-hour cron backup sync
- Hosted checkout pages with automatic receipts
- Feature gating based on subscription tier
- Test mode for testing without real charges

### Email System

Transactional emails with React Email and Resend:

- Build email templates with React components
- Welcome emails sent automatically on signup
- Preview templates locally with development server
- High deliverability optimized for transactional mail
- Custom domain verification for production

### File Uploads

Vercel Blob storage for user content:

- Profile images and organization logos
- Automatic image optimization and CDN delivery
- 5 MB size limit with format validation (JPEG, PNG, WebP)
- Admin-only access control for organization logos
- Base64 upload via tRPC for seamless integration

### Microservice Architecture

Python FastAPI engine service on Fly.io:

- Auto-scaling microservice (scales to zero when idle)
- FastAPI with Pydantic validation and auto-generated docs
- Sentry integration for error tracking and monitoring
- UV for fast dependency management
- Health checks and observability built-in
- Extend with custom business logic as needed

### Error Monitoring

Sentry integration for production confidence:

- Automatic error tracking (client, server, API, microservices)
- Performance monitoring with transaction tracking
- Session replay for debugging (10% sample, 100% on errors)
- Source maps for readable TypeScript stack traces
- Release tracking with automatic deployment tagging

## 🚦 Quick Start

**Want to use Kosuke Template for your SaaS?**  
→ Follow the [Deployment Guide](deployment-guide) to deploy in 60-90 minutes.

**Want to contribute to Kosuke Template?**  
→ See the [Contributing Guide](https://github.com/Kosuke-Org/kosuke-template#-contributing) in the README for local development setup.

## 🤝 Community & Support

- **Documentation**: You're reading it! Explore the sidebar for detailed guides.
- **GitHub**: [github.com/Kosuke-Org/kosuke-template](https://github.com/Kosuke-Org/kosuke-template)
- **Issues**: Report bugs or request features on GitHub

## 📄 License

Kosuke Template is open source and available under the MIT License.
