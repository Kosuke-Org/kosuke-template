---
sidebar_position: 2
---

# Project Structure

Understanding Kosuke Template's folder organization and conventions.

## Overview

```
kosuke-template/
├── app/                    # Next.js App Router
├── components/             # Shared UI components
├── lib/                    # Core utilities
├── hooks/                  # Custom React hooks
├── emails/                 # React Email templates
├── public/                 # Static assets
├── store/                  # Zustand stores
└── tests/                  # Test files
```

## App Directory (`/app`)

Next.js 15 App Router with route groups:

```
app/
├── (logged-in)/           # Protected routes
│   ├── billing/          # Subscription management
│   ├── org/              # Organization pages
│   └── settings/         # User settings
├── (logged-out)/         # Public routes
│   ├── home/            # Landing page
│   ├── sign-in/         # Auth pages
│   └── sign-up/
├── api/                  # API routes
│   ├── billing/         # Polar webhooks
│   ├── clerk/           # Clerk webhooks
│   ├── cron/            # Scheduled jobs
│   └── trpc/            # tRPC endpoints
├── layout.tsx           # Root layout
└── globals.css          # Global styles
```

### Route Groups

**`(logged-in)/`**: Requires authentication

- Middleware redirects unauthenticated users
- Access to all features
- Organization context available

**`(logged-out)/`**: Public access

- Landing pages
- Marketing content
- Authentication flows

## Components (`/components`)

Reusable UI components:

```
components/
├── ui/                   # Shadcn UI components
│   ├── button.tsx
│   ├── dialog.tsx
│   ├── form.tsx
│   └── ...
├── app-sidebar.tsx      # Main sidebar
├── nav-main.tsx         # Navigation
├── theme-toggle.tsx     # Dark mode toggle
└── providers.tsx        # Context providers
```

### Component Guidelines

1. **Use Shadcn UI** for base components
2. **Compose** for complex components
3. **Keep it focused** - single responsibility
4. **Co-locate** feature-specific components

## Lib Directory (`/lib`)

Core utilities and configurations:

```
lib/
├── db/                   # Database
│   ├── schema.ts        # Drizzle schema
│   ├── migrations/      # SQL migrations
│   └── drizzle.ts       # DB connection
├── auth/                 # Authentication
│   ├── index.ts         # Auth utilities
│   └── user-sync.ts     # Webhook handlers
├── billing/              # Polar integration
│   ├── index.ts
│   └── webhook.ts
├── email/                # Email service
│   ├── index.ts
│   └── templates.tsx
├── types/                # TypeScript types
│   ├── user.ts
│   ├── billing.ts
│   └── index.ts
└── utils.ts              # Utilities
```

### Key Files

**`lib/db/schema.ts`**: Database schema

- Table definitions
- Relations
- Indexes
- Type exports

**`lib/auth/index.ts`**: Auth utilities

- User session helpers
- Permission checks
- User queries

**`lib/billing/index.ts`**: Billing logic

- Subscription management
- Plan checks
- Checkout flows

## Hooks (`/hooks`)

Custom React hooks:

```
hooks/
├── use-auth-actions.ts         # Auth operations
├── use-subscription-data.ts    # Billing data
├── use-organizations.ts        # Organization CRUD
├── use-profile-image.ts        # File upload
└── use-toast.ts                # Notifications
```

### Hook Conventions

- Prefix with `use-`
- Return object with data and methods
- Handle loading states
- Include error handling
- Use TanStack Query for server state

## Emails (`/emails`)

React Email templates:

```
emails/
├── base-layout.tsx      # Shared layout
├── welcome.tsx          # Welcome email
└── ...                  # Additional templates
```

### Email Development

```bash
pnpm run email:dev
```

Visit `localhost:3001` to preview templates.

## Public (`/public`)

Static assets:

```
public/
├── logos/               # Brand logos
├── uploads/             # User uploads
├── favicon.ico
└── opengraph-image.png
```

## Configuration Files

### Root Level

- `next.config.ts` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS
- `drizzle.config.ts` - Drizzle ORM
- `tsconfig.json` - TypeScript
- `vitest.config.ts` - Testing
- `eslint.config.mjs` - Linting

### Package Management

- `package.json` - Dependencies and scripts
- `pnpm-lock.yaml` - Lock file
- `.npmrc` - pnpm configuration

### Docker

- `docker-compose.yml` - Local services
- `Dockerfile` - Container configuration

## File Naming Conventions

### React Components

```typescript
// PascalCase for components
UserProfile.tsx;
NavigationMenu.tsx;

// kebab-case for utilities
user - utils.ts;
date - helpers.ts;
```

### Routes

```
// kebab-case for routes
app/(logged-in)/user-settings/page.tsx
app/api/user-profile/route.ts
```

### Types

```typescript
// PascalCase for interfaces/types
export interface UserProfile {}
export type SubscriptionTier = 'free' | 'pro' | 'business';
```

## Import Aliases

Configure in `tsconfig.json`:

```typescript
// Use @ for absolute imports
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db/drizzle';
import { useAuth } from '@/hooks/use-auth';
```

## Environment Variables

Located in:

- `.env` - Local development
- `.env.example` - Template with all variables
- Vercel dashboard - Production

## Best Practices

### Code Organization

1. **Group by feature**: Keep related files together
2. **Shallow structure**: Avoid deep nesting
3. **Clear naming**: Descriptive file names
4. **Single responsibility**: One purpose per file

### Component Location

```
// ✅ Good: Co-locate feature components
app/(logged-in)/billing/
├── page.tsx
├── components/
│   ├── subscription-card.tsx
│   └── plan-selector.tsx

// ❌ Avoid: Everything in /components
components/
├── subscription-card.tsx
├── plan-selector.tsx
└── ... (hundreds of components)
```

### Type Organization

```typescript
// ✅ Good: Centralized types
lib/types/
├── user.ts         // User-related types
├── billing.ts      // Billing types
└── index.ts        // Re-exports

// ❌ Avoid: Types scattered everywhere
```

### Import Order

```typescript
// 1. External libraries
import { useState } from 'react';
import { Button } from '@/components/ui/button';

// 2. Internal utilities
import { db } from '@/lib/db/drizzle';
import { getCurrentUser } from '@/lib/auth';

// 3. Local imports
import { SubscriptionCard } from './components/subscription-card';
```

## Next Steps

Learn about the database schema:

👉 **[Database Schema](./database-schema)**

---

**Questions?** Check the [Reference](../reference/commands) section.
