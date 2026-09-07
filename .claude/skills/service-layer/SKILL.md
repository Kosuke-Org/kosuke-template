---
name: service-layer
description: Full walkthrough of the lib/services business-logic layer - file structure, object parameters, Drizzle-based typing, error codes via Error cause, handleApiError mapping, and calling services from tRPC, Server Components, Server Actions, API routes and cron jobs. Load when writing or refactoring a service, or when wiring a router/component to one.
---

# Service Layer

The rule itself lives in `CLAUDE.md`: **all business logic and database operations go in `lib/services/`.** This skill is the reference for how to write one.

#### **Why Service Layer?**

- ✅ **Reusability** - Services can be called from tRPC, Server Components, Server Actions, cron jobs, API routes
- ✅ **Testability** - Pure functions with no framework dependencies are easy to test
- ✅ **Separation of Concerns** - Business logic separate from API/presentation layers
- ✅ **Type Safety** - Full TypeScript support across all layers
- ✅ **Maintainability** - Single source of truth for business logic
- ✅ **Performance** - Server Components can call services directly (no HTTP overhead)
- ✅ **Authorization** - Centralized authorization logic in one place

#### **Service Layer Rules**

**✅ DO:**

- Put ALL database queries in services
- Put ALL business logic in services (calculations, validations, transformations)
- Put authorization checks in services
- Export named functions (not default exports)
- Use descriptive function names (`getUserById`, `updateNotificationSettings`, `createTask`)
- Return typed results (never `any`)
- **Throw errors with proper error codes** using `Error` with `cause` property (e.g., `throw new Error('message', { cause: ERRORS.NOT_FOUND })`)
- Write tests for every service function
- **Use Drizzle schema types** (`InferSelectModel`, `InferInsertModel`, `OrgRole`, etc.) from `@/lib/db/schema`
- **Use schema-based types for IDs and fields** (e.g., `User['id']`, `Organization['slug']`, `User['email']`) to ensure type safety and maintainability
- Keep services framework-agnostic (no tRPC, Zod, or Next.js dependencies)
- **Use object parameters for functions with 2+ arguments** (e.g., `updateUser({ userId, data })` instead of `updateUser(userId, data)`)

**❌ DON'T:**

- Put database queries in tRPC routers
- Put business logic in tRPC routers
- Put database queries in components
- Put business logic in hooks
- Use default exports
- Return untyped results
- Swallow errors silently
- **Import Zod schemas in services** - Use Drizzle schema types instead
- **Import tRPC types in services** - Keep services independent of API layer
- **Use multiple positional parameters** - Use object parameters instead for 2+ arguments

#### **Service File Structure**

```typescript
// lib/services/organization-service.ts
import { auth } from '@/lib/auth/providers';
import type { OrgRole, Organization, User } from '@/lib/db/schema';
import { ERRORS } from '@/lib/services/constants';

// ✅ Service functions with object parameters (2+ args)
// ✅ Use schema-based types for IDs (User['id'], Organization['id'])
export async function createOrganization(params: { name: string; headers: Headers }) {
  const slug = await generateUniqueOrgSlug(params.name);

  try {
    const result = await auth.api.createOrganization({
      body: { name: params.name, slug },
      headers: params.headers,
    });
    return result;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to create organization', {
      cause: ERRORS.BAD_REQUEST,
    });
  }
}

// ✅ Single argument functions don't need object wrapper
export function isGoogleApiKeyConfigured(): boolean {
  return !!process.env.GOOGLE_AI_API_KEY;
}

// ✅ Use Drizzle schema types and schema-based field types
export async function updateMemberRole(params: {
  organizationId: Organization['id']; // ✅ Schema-based type instead of string
  memberId: User['id']; // ✅ Schema-based type instead of string
  role: OrgRole; // ✅ Enum type from @/lib/db/schema
  headers: Headers;
}): Promise<{ success: boolean; message: string }> {
  await auth.api.updateMemberRole({
    body: {
      role: params.role,
      memberId: params.memberId,
      organizationId: params.organizationId,
    },
    headers: params.headers,
  });

  return {
    success: true,
    message: 'Member role updated successfully',
  };
}
```

**❌ WRONG - Using plain string types instead of schema-based types:**

```typescript
// ❌ BAD - Loses type safety and connection to schema
export async function updateMemberRole(params: {
  organizationId: string; // ❌ Should be Organization['id']
  memberId: string; // ❌ Should be User['id'] or OrgMembership['id']
  email: string; // ❌ Should be User['email']
  role: string; // ❌ Should be OrgRole enum type
  headers: Headers;
}) {
  /* ... */
}

// ❌ BAD - Creating custom type aliases
type UserId = User['id'];
type OrgId = Organization['id'];

export async function getUserOrganizations(params: { userId: UserId; headers: Headers }) {
  // ❌ Unnecessary indirection - just use User['id'] directly
}
```

**✅ CORRECT - Using schema-based types directly:**

```typescript
import type { OrgMembership, OrgRole, Organization, User } from '@/lib/db/schema';

// ✅ GOOD - Clear type safety tied to schema
export async function updateMemberRole(params: {
  organizationId: Organization['id']; // ✅ Explicitly typed from schema
  memberId: OrgMembership['id']; // ✅ Correct entity reference
  role: OrgRole; // ✅ Enum type from schema
  headers: Headers;
}) {
  /* ... */
}

// ✅ GOOD - Direct schema-based types (no unnecessary aliases)
export async function getUserOrganizations(params: { userId: User['id']; headers: Headers }) {
  // ✅ Clear and maintainable
}

// ✅ GOOD - Union types for flexible parameters
export async function removeMember(params: {
  organizationId: Organization['id'];
  memberIdOrEmail: OrgMembership['id'] | User['email']; // ✅ Explicit about what's accepted
  headers: Headers;
}) {
  /* ... */
}
```

#### **Error Handling in Services**

Services should throw errors with proper error codes using the `cause` property. This allows tRPC routers to map errors correctly.

```typescript
// lib/services/constants.ts
export const ERRORS = {
  NOT_FOUND: 'NOT_FOUND',
  BAD_REQUEST: 'BAD_REQUEST',
  FORBIDDEN: 'FORBIDDEN',
} as const;

export const ERROR_MESSAGES = {
  USER_NOT_FOUND: 'User not found',
} as const;

// lib/services/organization-service.ts
import { ERRORS, ERROR_MESSAGES } from '@/lib/services/constants';

export async function deleteOrganization(params: {
  organizationId: string;
  userId: string;
  headers: Headers;
}) {
  const { role } = await auth.api.getActiveMemberRole({ headers: params.headers });

  if (role !== ORG_ROLES.OWNER) {
    // ✅ Throw with error code via cause
    throw new Error('Only organization owners can delete the organization', {
      cause: ERRORS.FORBIDDEN,
    });
  }

  const organization = await getOrganizationById({
    organizationId: params.organizationId,
    headers: params.headers
  });

  if (!organization) {
    throw new Error(ERROR_MESSAGES.NOT_FOUND, {
      cause: ERRORS.NOT_FOUND
    });
  }

  // ... rest of logic
}
```

**ALWAYS use Drizzle schema types in services, NOT Zod schemas. Services must be framework-agnostic.**

**✅ CORRECT - Use Drizzle schema types:**

```typescript
// lib/services/rag-service.ts
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { type NewRagSettings, type RagSettings, ragSettings } from '@/lib/db/schema';

// ✅ Uses InferInsertModel type (NewRagSettings)
export async function updateRAGSettings(settings: NewRagSettings): Promise<RagSettings> {
  const { organizationId, ...updates } = settings;
  const existing = await getRAGSettings(organizationId);

  if (existing) {
    const [updated] = await db
      .update(ragSettings)
      .set(updates)
      .where(eq(ragSettings.organizationId, organizationId))
      .returning();
    return updated;
  }

  const [created] = await db.insert(ragSettings).values(settings).returning();
  return created;
}
```

**❌ WRONG - Don't use Zod schema inference in services:**

```typescript
// ❌ NO! Don't import Zod schemas in services
import type { z } from 'zod';

import { updateRagSettingsSchema } from '@/lib/trpc/schemas/rag';

// ❌ NO! Don't use Zod inference for service parameters
export async function updateRAGSettings(
  organizationId: string,
  updates: Omit<z.infer<typeof updateRagSettingsSchema>, 'organizationId'>
) {
  // This couples the service to the API validation layer!
}
```

**Why Drizzle Types in Services?**

- ✅ **Framework independence** - Services work without tRPC/Zod
- ✅ **Single source of truth** - Database schema drives types
- ✅ **Reusability** - Can be called from cron jobs, scripts, other services
- ✅ **Testability** - No framework dependencies in tests
- ✅ **Type safety** - Guaranteed match with database operations

**Type Flow Pattern:**

```
Database Schema (Drizzle)
    ↓ InferInsertModel / InferSelectModel
Service Layer (Pure TypeScript)
    ↓ Validated by Zod schema
tRPC Router (Validation Layer)
    ↓ Type-safe API
Client (React Components)
```

#### **tRPC Router as Thin Layer**

**tRPC routers should be thin validation layers that delegate to services and handle errors properly.**

```typescript
// lib/trpc/routers/organizations.ts
import { headers } from 'next/headers';

import * as organizationService from '@/lib/services/organization-service';
import { handleApiError } from '@/lib/utils';

import { protectedProcedure, router } from '../init';
import { createOrganizationSchema } from '../schemas/organizations';

export const organizationsRouter = router({
  // ✅ Thin layer - validate with Zod, call service, handle errors
  createOrganization: protectedProcedure
    .input(createOrganizationSchema) // ✅ Zod validation here
    .mutation(async ({ input }) => {
      try {
        // ✅ Call service with object parameters
        return await organizationService.createOrganization({
          name: input.name,
          headers: await headers(),
        });
      } catch (error) {
        // ✅ Use handleApiError to map service errors to tRPC errors
        handleApiError(error);
      }
    }),
});
```

**Error Handling with `handleApiError`:**

```typescript
// lib/utils.ts
export function handleApiError(error: ApiError | Error | unknown): never {
  if (error instanceof ApiError) {
    throw mapApiErrorToTRPC(error);
  }

  if (error instanceof Error) {
    // ✅ Maps error.cause to tRPC error code
    const code = isTRPCErrorCode(error.cause) ? error.cause : 'INTERNAL_SERVER_ERROR';
    throw new TRPCError({ code, message: error.message });
  }

  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: error instanceof Error ? error.message : 'Unknown error',
  });
}
```

**Pattern Benefits:**

- ✅ Services throw `Error` with `cause` property
- ✅ Router catches and maps to tRPC errors
- ✅ No tRPC dependencies in services
- ✅ Consistent error handling across all routers

#### **Calling Services from Different Contexts**

```typescript
// ✅ From tRPC Router
export const userRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    return await userService.getUserById(ctx.userId);
  }),
});

// ✅ From Server Component
import * as userService from '@/lib/services/user-service';

async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = await userService.getUserById(session.user.id);
  return <div>{user?.email}</div>;
}

// ✅ From Server Action
'use server';
import * as userService from '@/lib/services/user-service';

export async function updateUserAction(userId: string, data: UpdateUserInput) {
  return await userService.updateUser(userId, data);
}

// ✅ From API Route
import * as userService from '@/lib/services/user-service';

export async function GET(req: Request) {
  const user = await userService.getUserById(userId);
  return Response.json(user);
}

// ✅ From Cron Job
import * as userService from '@/lib/services/user-service';

export async function GET() {
  const inactiveUsers = await userService.getInactiveUsers();
  // Process inactive users
  return Response.json({ count: inactiveUsers.length });
}
```

## Directory layout

#### **📁 Architecture Overview**

```plaintext
lib/
├── services/              # Business logic layer (SERVER-ONLY)
│   ├── user-service.ts    # User-related business logic
│   ├── task-service.ts    # Task-related business logic
│   └── ...
├── trpc/                  # API layer (calls services)
│   ├── init.ts            # tRPC initialization, context, procedures
│   ├── router.ts          # Main app router
│   ├── client.ts          # Client-side tRPC configuration
│   ├── server.ts          # Server-side tRPC configuration
│   ├── schemas/           # Zod schemas (CLIENT-SAFE)
│   │   ├── tasks.ts
│   │   ├── user.ts
│   │   └── ...
│   ├── routers/           # Feature-specific routers (thin layer)
│   │   ├── tasks.ts       # Calls task-service.ts
│   │   ├── user.ts        # Calls user-service.ts
│   │   └── ...
│   └── index.ts
└── db/
    ├── schema.ts          # Database schema
    └── drizzle.ts         # Database connection
```

## Second worked example (user settings)

**Services are the single source of truth for business logic and database operations.**

**✅ CORRECT - Service with business logic:**

```typescript
// lib/services/user-service.ts
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { notificationSettings, users } from '@/lib/db/schema';

export interface NotificationSettings {
  emailNotifications: boolean;
  marketingEmails: boolean;
  securityAlerts: boolean;
}

export async function getNotificationSettings(userId: string): Promise<NotificationSettings> {
  const settings = await db
    .select()
    .from(notificationSettings)
    .where(eq(notificationSettings.userId, userId))
    .limit(1);

  if (settings.length === 0) {
    // Business logic: Create default settings if none exist
    const defaultSettings = {
      userId,
      emailNotifications: true,
      marketingEmails: false,
      securityAlerts: true,
    };
    await db.insert(notificationSettings).values(defaultSettings);
    return defaultSettings;
  }

  return settings[0];
}

export async function updateNotificationSettings(
  userId: string,
  updates: Partial<NotificationSettings>
): Promise<NotificationSettings> {
  // Business logic: Validate and update settings
  const [updated] = await db
    .update(notificationSettings)
    .set(updates)
    .where(eq(notificationSettings.userId, userId))
    .returning();

  if (!updated) {
    throw new Error('Failed to update notification settings');
  }

  return updated;
}

export async function getUserById(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return user ?? null;
}
```

**✅ CORRECT - tRPC router calling service:**

```typescript
// lib/trpc/routers/user.ts
import { z } from 'zod';

import * as userService from '@/lib/services/user-service';

import { protectedProcedure, router } from '../init';

export const userRouter = router({
  getNotificationSettings: protectedProcedure.query(async ({ ctx }) => {
    // Thin layer - just calls service
    return await userService.getNotificationSettings(ctx.userId);
  }),

  updateNotificationSettings: protectedProcedure
    .input(
      z.object({
        emailNotifications: z.boolean().optional(),
        marketingEmails: z.boolean().optional(),
        securityAlerts: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Thin layer - validation + service call
      return await userService.updateNotificationSettings(ctx.userId, input);
    }),
});
```

**✅ CORRECT - Server Component calling service:**

```typescript
// app/(logged-in)/settings/page.tsx
import { auth } from '@/lib/auth/providers';
import * as userService from '@/lib/services/user-service';

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect('/sign-in');

  // Server Component can call service directly!
  const settings = await userService.getNotificationSettings(session.user.id);
  const user = await userService.getUserById(session.user.id);

  return (
    <div>
      <h1>Settings</h1>
      <p>Email: {user?.email}</p>
      <p>Email Notifications: {settings.emailNotifications ? 'On' : 'Off'}</p>
    </div>
  );
}
```

**❌ WRONG - Business logic in tRPC router:**

```typescript
// ❌ NO! Don't put database operations in routers
export const userRouter = router({
  getNotificationSettings: protectedProcedure.query(async ({ ctx }) => {
    // ❌ Database logic should be in service!
    const settings = await db
      .select()
      .from(notificationSettings)
      .where(eq(notificationSettings.userId, ctx.userId))
      .limit(1);

    if (settings.length === 0) {
      // ❌ Business logic should be in service!
      const defaultSettings = {
        userId: ctx.userId,
        emailNotifications: true,
        marketingEmails: false,
        securityAlerts: true,
      };
      await db.insert(notificationSettings).values(defaultSettings);
      return defaultSettings;
    }

    return settings[0];
  }),
});
```

#### **🔧 When to Create Services**

**ALWAYS create a service when:**

- Adding new database operations
- Implementing business logic (calculations, validations, transformations)
- Creating reusable operations needed by multiple routers/components
- Adding complex queries with multiple table joins
- Implementing data aggregation or statistics

**Service Naming Convention:**

- File: `lib/services/{domain}-service.ts`
- Functions: Descriptive verbs (`getUserById`, `updateNotificationSettings`, `createTask`)
- Exports: Named exports (not default exports)
