---
sidebar_position: 1
slug: /
---

# Welcome to Kosuke Template

**Kosuke Template** is a production-ready, multi-tenant SaaS starter built with modern web technologies. Get your SaaS application up and running in minutes, not months.

## 🚀 What You Get

Kosuke Template includes everything you need to build a professional SaaS application:

### Core Stack

- **Next.js 15** with App Router for optimal performance
- **React 19** with Server Components
- **TypeScript** for type-safe development
- **Tailwind CSS** + **Shadcn UI** for beautiful interfaces

### Authentication & Organizations

- **Clerk** authentication with full **Organizations** support
- Teams, roles, and permissions out of the box
- Organization invitations and member management
- Webhook integration for automatic user sync

### Billing & Subscriptions

- **Polar** billing integration with subscription management
- Multiple subscription tiers (Free, Pro, Business)
- Automated subscription synchronization via cron jobs
- Webhook-based billing event handling

### Database & Storage

- **PostgreSQL** with **Drizzle ORM**
- **Neon** database with automatic preview branches
- **Vercel Blob** for file uploads
- Type-safe schema and migrations

### Email & Communication

- **Resend** email service
- **React Email** templates
- Welcome emails and notifications
- Full email template customization

### Monitoring & Quality

- **Sentry** error monitoring and performance tracking
- **Vitest** with React Testing Library
- Comprehensive ESLint and TypeScript checks
- Pre-commit hooks for code quality

## 🎯 Who Is This For?

Kosuke Template is perfect for:

- **Solo founders** who want to launch quickly
- **Development teams** building multi-tenant applications
- **Agencies** needing a robust starter for client projects
- **Engineers** who want to learn modern SaaS architecture

## 📚 Documentation Structure

This documentation is organized to guide you from setup to production:

### 🏁 [Getting Started](getting-started/prerequisites)

Step-by-step guide to set up all services and deploy your first version.

### 🏗️ [Architecture](architecture/tech-stack)

Understand the technical stack, project structure, and design decisions.

### ✨ [Features](features/organizations)

Deep dive into organizations, billing, email system, and more.

### 🚀 [Deployment](deployment/vercel-deployment)

Deploy to Vercel with database migrations and environment setup.

### 🏭 [Production](production/checklist)

Transition from development to production with custom domains and monitoring.

### 📖 [Services](services/clerk)

Detailed reference for each integrated service.

### 💻 [Development](development/local-setup)

Local setup, testing, database operations, and development workflow.

### 📋 [Reference](reference/commands)

Commands, environment variables, and troubleshooting guide.

## 🌟 Key Features

### Multi-Tenancy with Organizations

Built-in support for teams and organizations using Clerk's Organizations feature. Users can create organizations, invite team members, assign roles, and manage permissions.

### Automated Subscription Management

Polar billing integration with automated syncing every 6 hours. Webhooks handle real-time updates while cron jobs ensure data consistency.

### Type-Safe Everything

From database queries to API routes, Kosuke Template uses TypeScript throughout. Drizzle ORM provides type-safe database operations with automatic migrations.

### Beautiful UI Components

Pre-built Shadcn UI components with dark mode support. Responsive design that works beautifully on all devices.

### Production-Ready

Error monitoring with Sentry, automated testing with Vitest, and comprehensive linting ensures your code is production-ready from day one.

## 🚦 Quick Start

Ready to get started? Jump into the [Getting Started](getting-started/prerequisites) guide to set up your first Kosuke Template project.

Already familiar with the setup? Check out the [Architecture](architecture/tech-stack) section to understand how everything works together.

## 🤝 Community & Support

- **Documentation**: You're reading it! Explore the sidebar for detailed guides.
- **GitHub**: [github.com/filopedraz/kosuke-template](https://github.com/filopedraz/kosuke-template)
- **Issues**: Report bugs or request features on GitHub

## 📄 License

Kosuke Template is open source and available under the MIT License.
