---
name: trpc-api
description: Reference for the tRPC layer - directory layout, the client-safe schemas/ separation that prevents "server-only" import errors, the procedure ladder, client hooks and providers setup, server-side filtering, file upload via base64, and how to infer and organize TypeScript types from the router and Drizzle schema. Load when adding or changing a router, a Zod schema, or a client hook.
---

# tRPC API Layer

tRPC is a **thin validation layer** over `lib/services/`. Routers validate input, call a service, and map errors with `handleApiError`. They never contain database queries or business logic.

## Procedure ladder

Defined in `lib/trpc/init.ts`. Always pick the narrowest one that fits.

| Procedure             | Requires                                   | Adds to ctx                                                                      | Use for                                                      |
| --------------------- | ------------------------------------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `publicProcedure`     | nothing                                    | —                                                                                | Truly public data only                                       |
| `protectedProcedure`  | a session                                  | `userId`, `activeOrganizationId`, `orgRole`, `activeOrganizationSlug`, `getUser` | Any authenticated user action                                |
| `orgProcedure`        | session + `organizationId` in the input    | `organizationId`, `orgRole`, `membership`                                        | Routes that take `organizationId` and must verify membership |
| `orgOwnerProcedure`   | session + owner role on the **active** org | `organizationId`                                                                 | Destructive org-level actions (delete org, billing changes)  |
| `superAdminProcedure` | session + `user.role === 'admin'`          | —                                                                                | `admin.*` routers                                            |

`orgProcedure` reads `organizationId` from the raw input and throws `BAD_REQUEST` when it is missing, then `FORBIDDEN` when the caller is not a member. `orgOwnerProcedure` reads the **active** organization from context instead of the input — do not use it for routes that target an arbitrary org by id.

#### **📁 tRPC Structure**

```plaintext
lib/trpc/
├── init.ts          # tRPC initialization, context, and procedures (SERVER-ONLY)
├── router.ts        # Main app router combining all sub-routers (SERVER-ONLY)
├── client.ts        # Client-side tRPC configuration
├── server.ts        # Server-side tRPC configuration
├── schemas/         # Zod schemas (CLIENT-SAFE - no server dependencies!)
│   ├── tasks.ts     # Task validation schemas
│   ├── user.ts      # User validation schemas
│   └── ...
├── routers/         # Feature-specific routers (THIN LAYER - calls services)
│   ├── tasks.ts     # Validates input, calls task-service.ts
│   ├── user.ts      # Validates input, calls user-service.ts
│   └── ...
└── index.ts         # Exports (re-exports client-safe schemas)
```

#### **🔒 Schema Separation - CRITICAL**

**ALWAYS separate Zod schemas from tRPC routers to prevent "server-only" import errors in client components.**

**The Problem:**
Client components importing schemas from router files will transitively import server-only code (`auth()` from Better Auth, database connections, etc.), causing build/runtime errors.

**The Solution:**
Create a dedicated `lib/trpc/schemas/` directory with **zero server dependencies** - only Zod imports allowed!

```typescript
// ✅ CORRECT - lib/trpc/schemas/tasks.ts (CLIENT-SAFE)
import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  dueDate: z.date().optional(),
});

export const updateTaskSchema = z.object({
  id: z.number(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  completed: z.boolean().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  dueDate: z.date().nullable().optional(),
});
```

**Server Usage (Router):**

```typescript
// lib/trpc/routers/tasks.ts (SERVER-ONLY)
import { protectedProcedure, router } from '../init';
import { createTaskSchema, updateTaskSchema } from '../schemas/tasks';

export const tasksRouter = router({
  create: protectedProcedure.input(createTaskSchema).mutation(async ({ ctx, input }) => {
    // Implementation
  }),

  update: protectedProcedure.input(updateTaskSchema).mutation(async ({ ctx, input }) => {
    // Implementation
  }),
});
```

**Client Usage (Forms/Components):**

```typescript
// app/(logged-in)/tasks/components/task-dialog.tsx (CLIENT)
'use client';

import { createTaskSchema } from '@/lib/trpc/schemas/tasks';
// or via barrel export
import { createTaskSchema } from '@/lib/trpc';

type TaskFormValues = z.infer<typeof createTaskSchema>;

const form = useForm<TaskFormValues>({
  resolver: zodResolver(createTaskSchema), // Reuse the exact schema!
});
```

**Re-export for Convenience:**

```typescript
// lib/trpc/index.ts
export { trpc } from './client';
export { createCaller } from './server';
export type { AppRouter } from './router';

// Re-export schemas for convenience (client-safe, no server dependencies)
export * from './schemas/tasks';
export * from './schemas/user';
```

**Benefits:**

- ✅ Single source of truth - schemas defined once
- ✅ Client-safe imports - no server-only code leaks
- ✅ Type safety - same schemas validate both client forms and server inputs
- ✅ DRY principle - zero duplication
- ✅ Runtime validation - Zod validates at both layers

**❌ WRONG - Importing from router in client code:**

```typescript
// ❌ NO! This will cause "server-only cannot be imported" error
import { createTaskSchema } from '@/lib/trpc/routers/tasks';
```

**✅ CORRECT - Import from schemas directory:**

```typescript
// ✅ YES! Schemas have zero server dependencies
import { createTaskSchema } from '@/lib/trpc/schemas/tasks';
```

#### **🔧 Core Concepts**

**Context & Authentication:**

```typescript
// lib/trpc/init.ts
export const createTRPCContext = async () => {
  const { userId } = await auth();
  return { userId };
};

// Use protectedProcedure for authenticated routes
export const protectedProcedure = t.procedure.use(async (opts) => {
  if (!opts.ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return opts.next({ ctx: { userId: opts.ctx.userId } });
});
```

**Router Organization (Thin Layer Pattern):**

```typescript
// lib/trpc/routers/tasks.ts
import * as taskService from '@/lib/services/task-service';

import { protectedProcedure, router } from '../init';
import { createTaskSchema, taskListFiltersSchema } from '../schemas/tasks';

export const tasksRouter = router({
  list: protectedProcedure.input(taskListFiltersSchema).query(async ({ ctx, input }) => {
    // Thin layer - just validate input and call service
    return await taskService.listTasks(ctx.userId, input);
  }),

  create: protectedProcedure.input(createTaskSchema).mutation(async ({ ctx, input }) => {
    // Thin layer - just validate input and call service
    return await taskService.createTask(ctx.userId, input);
  }),
});
```

**Main Router:**

```typescript
// lib/trpc/router.ts
import { router } from './init';
import { tasksRouter } from './routers/tasks';

export const appRouter = router({
  tasks: tasksRouter,
  // Add more routers here
});

export type AppRouter = typeof appRouter;
```

#### **📱 Client-Side Usage**

**Setup in Providers:**

```typescript
// components/providers.tsx
import { trpc } from '@/lib/trpc/client';

export function Providers({ children }: { children: ReactNode }) {
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
          transformer: superjson, // Required for Date/Map/Set support
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

**Custom Hook Pattern:**

```typescript
// hooks/use-tasks.ts
'use client';

import { trpc } from '@/lib/trpc/client';

import { useToast } from '@/hooks/use-toast';

export function useTasks(filters?: { completed?: boolean }) {
  const { toast } = useToast();

  // Query
  const {
    data: tasks,
    isLoading,
    refetch,
  } = trpc.tasks.list.useQuery(filters, {
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Mutation with optimistic updates
  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Task created' });
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    tasks: tasks ?? [],
    isLoading,
    createTask: createTask.mutate,
    isCreating: createTask.isPending,
  };
}
```

#### **🏗️ Best Practices**

**Input Validation:**

- Always use Zod for input validation
- Reuse Zod schemas from centralized types when possible
- Provide clear error messages in validation rules

```typescript
.input(z.object({
  title: z.string().min(1, 'Title is required').max(255),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
}))
```

**Authorization & Security:**

- Always verify data ownership in **services** (not routers)
- Use `protectedProcedure` for authenticated endpoints
- Use `publicProcedure` only for truly public data
- Services handle authorization logic and throw appropriate errors

```typescript
// lib/services/task-service.ts
export async function updateTask(
  userId: string,
  taskId: string,
  updates: Partial<Task>
): Promise<Task> {
  // Authorization logic in service
  const [existingTask] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .limit(1);

  if (!existingTask) {
    throw new Error('Task not found or access denied');
  }

  const [updated] = await db.update(tasks).set(updates).where(eq(tasks.id, taskId)).returning();

  return updated;
}

// lib/trpc/routers/tasks.ts
export const tasksRouter = router({
  update: protectedProcedure.input(updateTaskSchema).mutation(async ({ ctx, input }) => {
    // Thin layer - service handles authorization
    return await taskService.updateTask(ctx.userId, input.id, input);
  }),
});
```

**Error Handling:**

```typescript
// Use appropriate error codes
throw new TRPCError({
  code: 'NOT_FOUND', // 404
  // code: 'UNAUTHORIZED',   // 401
  // code: 'FORBIDDEN',      // 403
  // code: 'BAD_REQUEST',    // 400
  // code: 'INTERNAL_SERVER_ERROR', // 500
  message: 'Resource not found',
});
```

**Type Safety & Inference (MANDATORY):**

- **ALWAYS infer types from tRPC router** - Never manually define input/output types
- **Use schema enums for type inference** - Import from `@/lib/db/schema` for enum types
- Export router types for client usage
- Leverage end-to-end type safety from database to UI

```typescript
// ✅ CORRECT - Infer types from tRPC router
import type { AppRouter } from '@/lib/trpc/router';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';

type RouterInput = inferRouterInputs<AppRouter>;
type RouterOutput = inferRouterOutputs<AppRouter>;

// Input types (create, update, filters)
type CreateTaskInput = RouterInput['tasks']['create'];
type TaskListFilters = RouterInput['tasks']['list'];

// Output types (query results)
type TaskWithOverdue = RouterOutput['tasks']['list'][number];

// ❌ WRONG - Manual type definitions that duplicate router
interface CreateTaskInput {
  // NO! This duplicates router input
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
}

// ✅ CORRECT - Import enum types from schema
import type { TaskPriority } from '@/lib/db/schema';
// Type is inferred from pgEnum, automatically syncs
```

**Performance:**

- Use batching for multiple queries (enabled by default with httpBatchLink)
- Set appropriate staleTime for queries
- Implement pagination for large datasets
- Use select to transform data when needed

**Server-Side Search & Filtering (MANDATORY):**

**ALWAYS implement search and filters at the database level via tRPC. NEVER use client-side filtering.**

```typescript
// ✅ CORRECT - Server-side search and filtering
export const tasksRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          completed: z.boolean().optional(),
          priority: z.enum(['low', 'medium', 'high']).optional(),
          searchQuery: z.string().optional(), // Server-side search
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(tasks.userId, ctx.userId)];

      // Filter by completion
      if (input?.completed !== undefined) {
        conditions.push(eq(tasks.completed, input.completed));
      }

      // Server-side search using SQL LIKE
      if (input?.searchQuery && input.searchQuery.trim()) {
        const searchTerm = `%${input.searchQuery.trim()}%`;
        conditions.push(or(like(tasks.title, searchTerm), like(tasks.description, searchTerm))!);
      }

      return await db
        .select()
        .from(tasks)
        .where(and(...conditions));
    }),
});

// Client usage - filters applied server-side
const { tasks } = useTasks({
  completed: filter === 'active' ? false : undefined,
  priority: priorityFilter === 'all' ? undefined : priorityFilter,
  searchQuery, // Sent to server for database-level search
});

// ❌ WRONG - Client-side filtering (slow, inefficient)
const { tasks } = useTasks(); // Fetches ALL tasks
const filteredTasks = useMemo(() => {
  return tasks.filter((t) => t.title.toLowerCase().includes(searchQuery.toLowerCase()));
}, [tasks, searchQuery]); // NO! This loads all data then filters in browser
```

**Why Server-Side Filtering?**

- ✅ Better performance - only matching data sent over network
- ✅ Scales with large datasets - database indexes are fast
- ✅ Lower bandwidth usage - reduced data transfer
- ✅ Better UX - faster response times
- ✅ Security - filtered data never leaves server

**User Router Patterns:**

The user router handles user settings and profile management:

```typescript
// Notification Settings
const { data: settings } = trpc.user.getNotificationSettings.useQuery();
const updateSettings = trpc.user.updateNotificationSettings.useMutation({
  onSuccess: () => {
    utils.user.getNotificationSettings.invalidate();
  },
});

// Profile Image Upload (base64)
const upload = trpc.user.uploadProfileImage.useMutation();
const deleteImage = trpc.user.deleteProfileImage.useMutation();

const handleUpload = async (file: File) => {
  const base64 = await fileToBase64(file);
  await upload.mutateAsync({
    fileBase64: base64,
    fileName: file.name,
    mimeType: file.type as 'image/jpeg' | 'image/png' | 'image/webp',
  });
};
```

**File Upload with tRPC:**

- tRPC doesn't support multipart form data natively
- Solution: Convert files to base64 strings for transmission
- Use `fileToBase64()` helper from `@/lib/utils`
- Server converts base64 back to buffer for storage
- Size limit: 5MB (accounts for base64 encoding overhead ~33%)

#### **🚫 When NOT to Use tRPC**

- **External API integrations** - Use direct fetch/axios
- **Webhooks** - Use standard Next.js API routes
- **Large file uploads (>5MB)** - Use dedicated multipart upload endpoints
- **Public APIs** - Consider REST for external consumers
- **Server Components** - Call services directly (no HTTP overhead)
- **Server Actions** - Call services directly
- **Cron jobs** - Call services directly
- **Background workers** - Call services directly

#### **✅ When TO Use tRPC**

- **Client Components** - Type-safe API calls from browser
- **Form submissions** - Client-side mutations with validation
- **Real-time updates** - Client-side data fetching with caching
- **Protected client operations** - Authenticated user actions from browser

#### **🔄 Service Usage Patterns**

**Services can be called from multiple contexts:**

```typescript
// ✅ Client Component → tRPC → Service
'use client';
import { trpc } from '@/lib/trpc/client';

function TaskList() {
  const { data: tasks } = trpc.tasks.list.useQuery();
  return <div>{/* render tasks */}</div>;
}

// ✅ Server Component → Service (direct)
import { auth } from '@/lib/auth/providers';
import * as taskService from '@/lib/services/task-service';

async function TaskList() {
  const session = await auth.api.getSession({ headers: await headers() });
  const tasks = await taskService.listTasks(session.user.id);
  return <div>{/* render tasks */}</div>;
}

// ✅ Server Action → Service (direct)
'use server';
import * as taskService from '@/lib/services/task-service';

export async function createTaskAction(userId: string, data: CreateTaskInput) {
  return await taskService.createTask(userId, data);
}

// ✅ Cron Job → Service (direct)
import * as taskService from '@/lib/services/task-service';

export async function GET() {
  const overdueTasks = await taskService.getOverdueTasks();
  // Process overdue tasks
  return Response.json({ processed: overdueTasks.length });
}

// ✅ API Route → Service (direct)
import * as userService from '@/lib/services/user-service';

export async function POST(req: Request) {
  const { userId } = await req.json();
  const user = await userService.getUserById(userId);
  return Response.json(user);
}
```

## TypeScript types

- Never use the `any` type - it defeats TypeScript's type checking
- For unknown data structures, use:
  - `unknown` for values that could be anything
  - `Record<string, unknown>` for objects with unknown properties
  - Create specific type definitions for metadata/details using recursive types
- For API responses and errors:
  - Define explicit interfaces for all response structures
  - Use discriminated unions for different response types
  - Create reusable types for common patterns (e.g., pagination, metadata)
- For Drizzle ORM:
  - Use generated types from schema definitions
  - Leverage `InferSelectModel` and `InferInsertModel` types
  - Create proper Zod schemas for validation

### Type Management and Organization

- **Type Creation Philosophy (MANDATORY)**:
  - **ONLY create types that are ACTUALLY USED** - Never create types "just in case" or for completeness
  - **Verify usage before creation** - Before defining any type, ensure it has at least one concrete usage
  - **Remove unused types immediately** - If a type becomes unused, delete it rather than keeping it around
  - **Prefer inference over manual definition** - Always try to infer types from existing sources first

- **Type Inference Priority (MANDATORY)**:
  1. **tRPC Router Types** - ALWAYS infer from router using `inferRouterInputs` and `inferRouterOutputs`
  2. **Database Schema Types** - Import from `@/lib/db/schema` (includes pgEnum types)
  3. **Domain Extension Types** - Only define in `lib/types/` when extending base types AND actively used
  4. **Infrastructure Types** - API utilities, errors, and configurations in `lib/api/`

- **Centralized Types**: All shared types are organized by domain and functionality
  - `lib/types/user.ts` - Re-exports User from schema + domain extensions (UserProfile, etc.)
  - `lib/types/billing.ts` - Re-exports subscription types + domain extensions
  - `lib/types/task.ts` - Re-exports Task, TaskPriority from schema (even if not extending)
  - `lib/types/index.ts` - Re-exports all domain types for easy importing
  - `lib/api/` - API infrastructure types and utilities (errors, responses, etc.)
  - `lib/services/` - Service-specific types can be defined inline or exported if reused

- **Type Hierarchy & Re-export Pattern**: Follow this priority order
  1. **Database Schema** → Define with pgEnum and export inferred types
  2. **Domain Type Files** → ALWAYS re-export schema types (provides domain boundary)
  3. **tRPC Router** → Infer input/output types, never manually define
  4. **Domain Extensions** → Add computed/derived fields when needed
  5. Prefer `Pick<>`, `Omit<>`, and intersection types over full redefinition

- **Why Re-export?** Even when not extending types:
  - ✅ Consistent import patterns across codebase
  - ✅ Domain boundary - separates database from application layer
  - ✅ Extension point - easy to add derived types later
  - ✅ Single source - change import location once if schema changes

- **Import Patterns**:
  - **tRPC Types**: Use `inferRouterInputs<AppRouter>['feature']['procedure']`
  - **Domain Types**: ALWAYS use `import type { Task, User, TaskPriority } from '@/lib/types'`
  - **Schema Direct**: Only import from `@/lib/db/schema` for database operations (queries, migrations)
  - **Infrastructure**: Use `import type { ApiResponse } from '@/lib/api'`
  - **Never duplicate** type definitions that exist in schema or router

- **Type Naming**: Follow consistent naming conventions
  - Base types: `User`, `UserSubscription`, `Task` (match schema exports)
  - Enum types: `TaskPriority`, `SubscriptionTier` (inferred from pgEnum)
  - Extended types: `UserWithSubscription`, `UserProfile`, `TaskWithUser`
  - List types: Infer from router output `RouterOutput['tasks']['list'][number]`
  - Input types: Infer from router input `RouterInput['tasks']['create']`
  - Statistics: `UserStats`, `BillingStats` (computed aggregations)

- **Component Props**: Define component-specific prop interfaces inline
  - Shadcn UI components already provide comprehensive typed interfaces
  - Create component-specific interfaces only when needed (e.g., `TechCardProps`)
  - Avoid over-abstracting UI component types unless there's clear reuse

### Centralized Type Organization Rules - MANDATORY

**NEVER define types inside hooks, components, or utility functions. ALL types must be centralized.**

- **Domain Types**: Business logic types go in `lib/types/`
  - User-related: authentication, profiles, preferences
  - Billing-related: subscriptions, payments, tiers
  - Application-specific: features, settings, analytics

- **Infrastructure Types**: Technical types go in `lib/api/`
  - API responses, errors, pagination
  - Async operation configurations
  - Form handling configurations
  - Generic utility types

**✅ CORRECT - Type inference and centralization:**

```typescript
// hooks/use-tasks.ts - Infer types from tRPC router
import type { inferRouterInputs } from '@trpc/server';

import { trpc } from '@/lib/trpc/client';
import type { AppRouter } from '@/lib/trpc/router';

// lib/db/schema.ts - Define enum at database level
export const taskPriorityEnum = pgEnum('task_priority', ['low', 'medium', 'high']);
export type TaskPriority = (typeof taskPriorityEnum.enumValues)[number];

// lib/types/task.ts - Minimal re-exports only
export type { Task, TaskPriority } from '@/lib/db/schema';

// lib/types/user.ts - Domain extensions (not in schema/router)
export interface NotificationSettings {
  emailNotifications: boolean;
  marketingEmails: boolean;
  securityAlerts: boolean;
}

// lib/api/index.ts - Infrastructure types
export interface AsyncOperationOptions {
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

type RouterInput = inferRouterInputs<AppRouter>;
type CreateTaskInput = RouterInput['tasks']['create'];
type TaskListFilters = RouterInput['tasks']['list'];

export function useTasks(filters?: TaskListFilters) {
  // Types are automatically inferred from router!
}
```

**❌ WRONG - Manual type definitions:**

```typescript
// ❌ NO! Don't manually define types that can be inferred
// hooks/use-tasks.ts
interface CreateTaskInput {
  // This duplicates the tRPC router input definition!
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high'; // Should use pgEnum from schema
}

// lib/types/task.ts
export type TaskPriority = 'low' | 'medium' | 'high'; // ❌ NO! Infer from pgEnum

// hooks/use-notification-settings.ts
interface NotificationSettings {
  // ❌ NO! Move to lib/types/
  emailNotifications: boolean;
  marketingEmails: boolean;
  securityAlerts: boolean;
}

interface AsyncOperationOptions {
  // ❌ NO! Move to lib/api/
  successMessage?: string;
  errorMessage?: string;
}
```

**✅ Import Patterns:**

```typescript
// For tRPC types (highest priority - infer from router)
import type { AppRouter } from '@/lib/trpc/router';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
type RouterInput = inferRouterInputs<AppRouter>;
type CreateTaskInput = RouterInput['tasks']['create'];

// For domain types (ALWAYS import from @/lib/types, even if just re-exports)
import type { User, Task, TaskPriority, UserProfile, NotificationSettings } from '@/lib/types';

// For infrastructure types
import type { ApiResponse, AsyncOperationOptions } from '@/lib/api';

// ❌ WRONG - Don't import domain types directly from schema in application code
import type { User, Task } from '@/lib/db/schema'; // NO! Use @/lib/types instead

// ✅ OK - Only import from schema in database operations (tRPC routers, migrations)
// lib/trpc/routers/tasks.ts
import { tasks } from '@/lib/db/schema'; // OK in database queries
```

**✅ Type Location Decision Tree:**

- **Is it a tRPC input/output type?** → Infer from router with `inferRouterInputs`/`inferRouterOutputs`
- **Is it a database enum?** → Define with `pgEnum` in schema, export inferred type, re-export in `lib/types/`
- **Is it a database entity?** → Define in `lib/db/schema.ts`, ALWAYS re-export in `lib/types/{domain}.ts`
- **Is it domain-specific business logic?** → `lib/types/{domain}.ts` (re-export base + add extensions)
- **Is it API/infrastructure related?** → `lib/api/index.ts`
- **Is it component-specific props?** → Define inline ONLY if truly unique to that component

**Enforcement:**

- **Type Inference First**: ALWAYS infer from tRPC router and database schema before creating manual types
- **No Duplicate Types**: If a type exists in router or schema, NEVER manually define it
- **Always Re-export**: ALWAYS re-export schema types in `lib/types/` even if not extending
- **Import from Domain**: Application code MUST import domain types from `@/lib/types`, not schema
- **Schema Direct Imports**: Only in database operations (tRPC routers, migrations, queries)
- All hooks MUST import types from `@/lib/types` or infer from tRPC
- NO type definitions allowed in hooks, utilities, or components (except component props)
- **pgEnum for Enums**: Use database-level enums, export inferred type, re-export in domain types
- Always export new domain types through `lib/types/index.ts` for consistent imports
