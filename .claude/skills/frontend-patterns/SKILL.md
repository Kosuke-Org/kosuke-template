---
name: frontend-patterns
description: Client-side patterns reference - TanStack Query usage boundaries and best practices, Next.js useSearchParams vs location.search vs the searchParams prop, the useClient hook for client-only code, the full Links-vs-Buttons rationale, and the modal-vs-detail-page rule. Load when writing client components, hooks, or navigation.
---

# Frontend Patterns

## State management overview

- **Global State**: Use Zustand for complex state management
- **Server State**: Use TanStack Query for API calls and caching
- **Forms**: React Hook Form with Zod validation using Field components
- **Local State**: useState for component-specific state
- **Persistence**: Use Zustand persist middleware when needed

### TanStack Query Usage Guidelines - MANDATORY

**Use TanStack Query for ALL server-side data operations when appropriate.**

#### **✅ WHEN TO USE TanStack Query**

- **API data fetching** - GET requests to your backend
- **Server mutations** - POST/PUT/DELETE operations
- **Form submissions** that call APIs
- **Background data synchronization**
- **Real-time data that needs caching**

#### **❌ WHEN NOT TO USE TanStack Query**

- **Browser APIs** - window resize, localStorage, geolocation
- **React Context** - state management, theme providers
- **Computed values** - derived from props or local state
- **Client-side only operations** - navigation, local calculations
- **Third-party SDK calls**

#### **🔧 Implementation Patterns**

**✅ CORRECT - Data Fetching with useQuery:**

```typescript
// hooks/use-user-settings.ts
import { useQuery } from '@tanstack/react-query';

import type { UserSettings } from '@/lib/types';

export function useUserSettings() {
  return useQuery({
    queryKey: ['user-settings'],
    queryFn: async (): Promise<UserSettings> => {
      const response = await fetch('/api/user/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      const data = await response.json();
      return data.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}
```

**✅ CORRECT - Mutations with useMutation:**

```typescript
// hooks/use-update-profile.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { UserProfile } from '@/lib/types';

import { useToast } from '@/hooks/use-toast';

export function useUpdateProfile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (!response.ok) throw new Error('Failed to update profile');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast({ title: 'Success', description: 'Profile updated successfully' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
```

**❌ WRONG - Don't use for client-side operations:**

```typescript
// ❌ NO! Use regular React hooks
const windowSize = useQuery({
  queryKey: ['window-size'],
  queryFn: () => ({ width: window.innerWidth, height: window.innerHeight }),
});

// ✅ YES! Use regular React state
const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
useEffect(() => {
  const handleResize = () =>
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

#### **🏗️ Best Practices**

**Query Keys:**

- Use descriptive, hierarchical keys: `['user', userId, 'settings']`
- Include relevant parameters: `['posts', { page, limit, search }]`
- Keep consistent patterns across the app

**Error Handling:**

- Always handle errors in `onError` callbacks
- Use toast notifications for user feedback
- Log errors to console for debugging
- Provide meaningful error messages

**Loading States:**

- Use `isLoading`, `isPending`, `isFetching` appropriately
- Show skeletons for initial loads
- Show spinners for mutations
- Handle empty states gracefully

**Cache Management:**

- Set appropriate `staleTime` for data freshness
- Use `invalidateQueries` after mutations
- Implement optimistic updates when beneficial
- Consider background refetching for critical data

**Integration with Centralized Types:**

```typescript
// Always import types from centralized locations
import type { ApiResponse } from '@/lib/api';
import type { NotificationSettings, UserProfile } from '@/lib/types';

// Use proper TypeScript generics with TanStack Query
const query = useQuery<UserProfile, Error>({
  queryKey: ['user-profile'],
  queryFn: fetchUserProfile,
});
```

### Next.js useSearchParams() Usage - MANDATORY

**ALWAYS handle `useSearchParams()` properly to avoid static generation errors. Next.js requires Suspense boundaries for reactive search params, or use `location.search` for non-reactive access.**

#### **The Problem**

Using `useSearchParams()` in a page that's being statically generated causes build errors:

```
useSearchParams() should be wrapped in a suspense boundary at page "/terms"
```

#### **✅ WHEN TO USE location.search (Non-Reactive)**

**Use `window.location.search` when query params are read-only and don't need to trigger re-renders:**

- **One-time reads** - Reading query params for initial render only
- **Static pages** - Public pages that are statically generated
- **No reactivity needed** - Params don't change during component lifecycle
- **Server-side compatible** - Works in both client and server components (with proper checks)

```typescript
// ✅ CORRECT - Use location.search for non-reactive access
'use client';

import { useEffect, useState } from 'react';

export default function TermsPage() {
  const [queryParam, setQueryParam] = useState<string | null>(null);

  useEffect(() => {
    // Read query params once on mount
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setQueryParam(params.get('ref'));
    }
  }, []);

  return <div>Referral: {queryParam}</div>;
}

// ✅ CORRECT - Server Component with searchParams prop
export default function TermsPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const params = await searchParams;
  return <div>Referral: {params.ref}</div>;
}
```

#### **✅ WHEN TO USE useSearchParams() with Suspense (Reactive)**

**Use `useSearchParams()` wrapped in Suspense when query params need to be reactive:**

- **Reactive updates** - Component needs to re-render when params change
- **Dynamic filtering** - Search, pagination, or filtering based on URL params
- **Real-time sync** - URL params sync with component state
- **Client-side navigation** - Params change via Next.js router

```typescript
// ✅ CORRECT - Wrap useSearchParams() in Suspense
'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

  return <div>Search: {query}</div>;
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchContent />
    </Suspense>
  );
}
```

#### **❌ WRONG - useSearchParams() without Suspense**

```typescript
// ❌ NO! This causes build errors on static pages
'use client';

import { useSearchParams } from 'next/navigation';

export default function TermsPage() {
  const searchParams = useSearchParams(); // ❌ Missing Suspense boundary
  const ref = searchParams.get('ref');

  return <div>Referral: {ref}</div>;
}
```

#### **🔧 Decision Tree**

**Do query params need to trigger re-renders when they change?**

- ✅ **NO** (read-only, one-time) → Use `window.location.search` or `searchParams` prop (Server Components)
- ✅ **YES** (reactive, dynamic) → Use `useSearchParams()` wrapped in `<Suspense>`

**Examples:**

- Terms/Privacy pages (static) → `location.search` or `searchParams` prop
- Search results (dynamic) → `useSearchParams()` with Suspense
- Filter pages (reactive) → `useSearchParams()` with Suspense
- Analytics tracking (one-time) → `location.search`

#### **🏗️ Best Practices**

**Server Components (Recommended for Static Pages):**

```typescript
// ✅ BEST - Server Component with searchParams prop (no Suspense needed)
export default async function TermsPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const params = await searchParams;
  return <div>Referral: {params.ref || 'none'}</div>;
}
```

**Client Components (Non-Reactive):**

```typescript
// ✅ GOOD - Client Component with location.search
'use client';

import { useEffect, useState } from 'react';

export default function TermsPage() {
  const [ref, setRef] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setRef(params.get('ref'));
    }
  }, []);

  return <div>Referral: {ref || 'none'}</div>;
}
```

**Client Components (Reactive):**

```typescript
// ✅ GOOD - Client Component with Suspense
'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function TermsContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref');

  return <div>Referral: {ref || 'none'}</div>;
}

export default function TermsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TermsContent />
    </Suspense>
  );
}
```

**Always choose the simplest solution that meets your requirements. Prefer Server Components with `searchParams` prop for static pages.**

### Client-Side Detection - MANDATORY

**ALWAYS use the `useClient` hook to detect client-side mounting. NEVER use manual `useState` + `useEffect` patterns.**

#### **✅ WHEN TO USE useClient**

- **Client-only operations** - Window/document access, browser APIs
- **Theme detection** - Reading system theme preferences
- **Local storage** - Accessing localStorage/sessionStorage
- **Media queries** - Checking viewport sizes
- **Any browser-specific feature** - Features that don't exist on server

#### **🔧 Implementation Pattern**

**✅ CORRECT - Use useClient hook:**

```typescript
'use client';

import { useClient } from '@/hooks/use-client';
import { useTheme } from 'next-themes';

export function ThemeSwitcher() {
  const { isClient } = useClient();
  const { theme, setTheme } = useTheme();

  if (!isClient) {
    return <div className="h-10 w-24" />; // Skeleton/placeholder
  }

  return (
    <select value={theme} onChange={(e) => setTheme(e.target.value)}>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="system">System</option>
    </select>
  );
}
```

**❌ WRONG - Manual useState + useEffect:**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';

export function ThemeSwitcher() {
  // ❌ NO! Don't manually manage mounted state
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-10 w-24" />;
  }

  return (
    <select value={theme} onChange={(e) => setTheme(e.target.value)}>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="system">System</option>
    </select>
  );
}
```

#### **🏗️ Best Practices**

**Why useClient?**

- ✅ Consistent pattern across codebase
- ✅ Uses React 18's `useSyncExternalStore` (more reliable)
- ✅ No hydration mismatches
- ✅ Cleaner, more maintainable code
- ✅ Single source of truth for client detection

**Common Use Cases:**

```typescript
// Window size detection
const { isClient } = useClient();
if (!isClient) return null;
const width = window.innerWidth;

// localStorage access
const { isClient } = useClient();
const savedValue = isClient ? localStorage.getItem('key') : null;

// Browser-only libraries
const { isClient } = useClient();
if (!isClient) return <Skeleton />;
return <BrowserOnlyComponent />;
```

**Return Placeholder/Skeleton:**

- Always return a placeholder or skeleton during SSR
- Match dimensions to prevent layout shift
- Use semantic HTML for better accessibility

## Navigation: Links vs Buttons - MANDATORY

**Use semantic HTML for navigation. If it navigates, it should be a link, not a button.**

### ✅ WHEN TO USE Links (Next.js Link component)

- **Page navigation** - Navigating to internal routes
- **External URLs** - Links to external websites
- **Anchor navigation** - Jump to sections on the page
- **Any action that changes the URL** - Even if styled as a button

### ✅ WHEN TO USE Buttons

- **Form submissions** - Submitting data to server
- **Data mutations** - Creating, updating, deleting data
- **Modal/dialog triggers** - Opening/closing UI elements (no URL change)
- **Client-side actions** - Sorting, filtering, toggling without navigation

### 🔧 Implementation Patterns

**✅ CORRECT - Link styled as button for navigation:**

```typescript
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Github } from 'lucide-react';

// Navigation to internal route - use Link
<Button asChild>
  <Link href="/settings">
    <Github className="h-4 w-4 mr-2" />
    Connect GitHub in Settings
  </Link>
</Button>

// External navigation
<Button asChild variant="outline">
  <Link href="https://github.com/user/repo" target="_blank" rel="noopener noreferrer">
    View on GitHub
  </Link>
</Button>
```

**✅ CORRECT - Button for actions (no navigation):**

```typescript
// Data mutation - use Button with onClick
<Button onClick={() => createProject(data)}>
  <FolderPlus className="h-4 w-4 mr-2" />
  Create Project
</Button>

// Toggle modal - use Button with onClick
<Button onClick={() => setIsOpen(true)}>
  Open Dialog
</Button>
```

**❌ WRONG - Button with onClick for navigation:**

```typescript
// ❌ NO! This breaks accessibility, SEO, and UX
<Button onClick={() => window.location.href = '/settings'}>
  <Github className="h-4 w-4 mr-2" />
  Connect GitHub in Settings
</Button>

// ❌ NO! This breaks Next.js routing and prefetching
<Button onClick={() => router.push('/settings')}>
  Go to Settings
</Button>
```

### 🏗️ Best Practices

**Accessibility Benefits:**

- Screen readers announce links as navigation elements
- Links support keyboard navigation (Enter key)
- Links have proper semantic meaning in the document structure

**SEO Benefits:**

- Search engines can crawl `<a>` tags for site structure
- Internal links contribute to page ranking
- Proper link structure helps with site discovery

**UX Benefits:**

- Right-click → "Open in new tab" works
- Cmd/Ctrl + click to open in new tab works
- Next.js automatically prefetches linked pages on hover
- Browser back/forward buttons work correctly
- Links show URL in browser status bar on hover

**Styling:**

- Use `asChild` prop on Shadcn Button to render as Link
- Button maintains all visual styles while being semantically correct
- Supports all button variants (default, outline, ghost, etc.)

**Next.js Link Features:**

```typescript
// Prefetch on hover (default behavior)
<Link href="/dashboard" prefetch={true}>Dashboard</Link>

// Scroll to top on navigation (default)
<Link href="/about" scroll={true}>About</Link>

// Replace history instead of push
<Link href="/login" replace>Login</Link>

// Shallow routing (no server request)
<Link href="/posts?sort=date" shallow>Sort by Date</Link>
```

### Decision Tree

**Does this element change the URL or navigate to a different page?**

- ✅ **YES** → Use `Link` (can be styled as button with `asChild`)
- ❌ **NO** → Use `Button` with `onClick`

**Examples:**

- "Go to Settings" → `Link` styled as button
- "Save Changes" → `Button` with mutation
- "View Details" (navigates) → `Link`
- "Delete Item" (mutation) → `Button`
- "Open Modal" (no navigation) → `Button`
- "Next Page" (pagination) → `Link`

### Modal vs Detail Page Pattern - MANDATORY

**For new/edit of a single item we should always use modals, while for view go to detail page.**

- **Create/Edit actions** → Use modals (Dialog component)
  - Creating a new item
  - Editing an existing item
  - Quick forms and inline editing
- **View actions** → Navigate to detail page
  - Viewing full item details
  - Read-only information display
  - Complex content that requires full page space

**CRITICAL: NEVER add back buttons to detail pages**

- ❌ **DO NOT** create back buttons in detail pages
- ✅ Users should use the browser back button or breadcrumbs for navigation
- ✅ The sidebar and breadcrumbs provide sufficient navigation context
- ✅ Removing back buttons keeps the UI clean and consistent across all detail views

```typescript
// ✅ CORRECT - Create/Edit in modal (Orders example)
<Button onClick={() => setCreateDialogOpen(true)}>
  <Plus className="mr-2 h-4 w-4" />
  New Order
</Button>

<OrderDialog
  open={createDialogOpen}
  onOpenChange={setCreateDialogOpen}
  onSubmit={async (values) => {
    await createOrder({ ...values, organizationId: activeOrganization.id });
  }}
  mode="create"
/>

// Edit action also uses modal
<Button onClick={() => {
  setSelectedOrderId(order.id);
  setEditDialogOpen(true);
}}>
  Edit Order
</Button>

<OrderDialog
  open={editDialogOpen}
  onOpenChange={setEditDialogOpen}
  initialValues={selectedOrder}
  mode="edit"
/>

// ✅ CORRECT - View on detail page
<Button
  variant="ghost"
  onClick={() => router.push(`/org/${slug}/orders/${order.id}`)}
>
  View Details
</Button>
```
