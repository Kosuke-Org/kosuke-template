---
name: shadcn-ui
description: UI and design reference - Shadcn component management and update commands, border radius / empty state / dialog icon / separator conventions, the design philosophy and quality rubric, skeleton loading patterns, and the color token system. Load when building or restyling any UI component or page.
---

# Shadcn UI, Components & Design

## Component management

```bash
bun run shadcn:update  # Update all shadcn components
bun run shadcn:check   # Diff local components against upstream
```

Components in `./components/ui` are **pre-installed — do not reinstall them**. Check https://ui.shadcn.com/docs/components before hand-rolling any UI: use `Combobox` for searchable selects, `Command` for search, `Dialog` for modals, and so on.

- **Shadcn Components**: Use pre-installed components from `./components/ui`
  - ALWAYS check https://ui.shadcn.com/docs/components before building custom UI
  - Use `Combobox` for searchable selects, `Command` for search, `Dialog` for modals, etc.
- **Icons**: Always use Lucide React (`lucide-react` package)
- **Styling**: Tailwind CSS with Shadcn design tokens
- **Themes**: Dark/light mode support built-in
- **Layout**: Responsive design with mobile-first approach
- **Loading States**: Use Shadcn skeleton components for loading
- **Error Handling**: Implement proper error boundaries
- **Navigation**: Use Next.js `Link` component for navigation, NOT buttons with onClick
- **Component Colocation**: Module-specific components should be colocated within their feature directory
  - Place components inside `app/(logged-in)/[module]/components/` for feature modules
  - Example: `app/(logged-in)/tasks/components/task-item.tsx`
  - Only use `./components/` for truly global, reusable components shared across multiple modules
  - This improves code organization, discoverability, and maintains clear feature boundaries

#### **UI Consistency Guidelines - MANDATORY**

**Border Radius:**

- ALWAYS use Shadcn UI default border radius values
- NEVER override border radius with custom values
- Use Tailwind's standard classes (`rounded`, `rounded-md`, `rounded-lg`) only when needed
- Default Shadcn components already have proper border radius - don't add extra classes

```typescript
// ✅ CORRECT - Use Shadcn defaults
<Card>
  <CardHeader>...</CardHeader>
</Card>

// ❌ WRONG - Don't override border radius
<Card className="rounded-xl">
  <CardHeader className="rounded-t-xl">...</CardHeader>
</Card>
```

**Empty States:**

- NEVER use icons in empty states
- Keep empty state messages simple and text-only
- Use clear, actionable messaging

```typescript
// ✅ CORRECT - No icon in empty state
<div className="flex flex-col items-center justify-center py-12 text-center">
  <h3 className="font-semibold text-lg mb-1">No tasks found</h3>
  <p className="text-sm text-muted-foreground">
    Create your first task to get started
  </p>
</div>

// ❌ WRONG - Don't add icons to empty states
<div className="flex flex-col items-center justify-center py-12 text-center">
  <Inbox className="h-16 w-16 mb-4 text-muted-foreground" />
  <h3 className="font-semibold text-lg mb-1">No tasks found</h3>
  <p className="text-sm text-muted-foreground">
    Create your first task to get started
  </p>
</div>
```

**Confirmation Dialog Icons:**

- Use standardized icons for dialog types:
  - Destructive actions → `AlertTriangle` (h-5 w-5)
  - Delete actions → `Trash` (h-5 w-5)
  - Info dialogs → `Info` or `AlertCircle` (h-5 w-5)
  - Success confirmations → `CheckCircle2` (h-5 w-5)
- Always use consistent sizing (h-5 w-5 for dialog icons)

```typescript
// ✅ CORRECT - Standardized destructive dialog icon
<AlertDialogHeader>
  <div className="flex items-center gap-2">
    <AlertTriangle className="h-5 w-5 text-destructive" />
    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
  </div>
  <AlertDialogDescription>
    This action cannot be undone.
  </AlertDialogDescription>
</AlertDialogHeader>
```

**UI Component Separators:**

- NEVER add separators unless explicitly requested by the user
- Keep components minimal by default
- Don't add decorative elements that weren't asked for

```typescript
// ✅ CORRECT - No separator unless needed
<DropdownMenu>
  <DropdownMenuContent>
    <DropdownMenuItem>Edit</DropdownMenuItem>
    <DropdownMenuItem>Delete</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>

// ❌ WRONG - Don't add separators by default
<DropdownMenu>
  <DropdownMenuContent>
    <DropdownMenuItem>Edit</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem>Delete</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Loading States & Skeleton Components - MANDATORY

**ALWAYS use Skeleton components for page-level loading states. NEVER use simple "Loading..." text for page content.**

#### **✅ WHEN TO USE Skeleton Components**

- **Page-level loading** - When entire page or major sections are loading
- **Data fetching states** - While waiting for API responses
- **Initial page renders** - Before content hydrates
- **Component mount states** - When components are being prepared
- **List/grid loading** - When loading multiple items

#### **✅ WHEN TO USE Loading Text (with spinners)**

- **Button states** - "Uploading...", "Processing...", "Saving..."
- **Form submissions** - Short-lived action feedback
- **File operations** - Upload/download progress indicators
- **Modal actions** - Quick operations within modals

#### **🔧 Implementation Patterns**

**✅ CORRECT - Page-level skeleton (colocated):**

```typescript
// app/(logged-in)/tasks/page.tsx
'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader } from '@/components/ui/card';

// Skeleton components colocated with the page
function TaskSkeleton() {
  return (
    <Card className="py-3">
      <CardHeader className="flex flex-row items-center gap-4 px-6 py-0">
        <Skeleton className="h-5 w-5 rounded" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </CardHeader>
    </Card>
  );
}

function TasksPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <TaskSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// Main page component
export default function TasksPage() {
  const { data, isLoading } = useQuery({ /* ... */ });

  if (isLoading) {
    return <TasksPageSkeleton />;
  }

  return <div>{/* actual content */}</div>;
}
```

**✅ CORRECT - Button loading states:**

```typescript
<Button disabled={isSubmitting}>
  {isSubmitting ? (
    <>
      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      Processing...
    </>
  ) : (
    'Submit Form'
  )}
</Button>
```

**❌ WRONG - Simple loading text for pages:**

```typescript
// ❌ NO! Don't use simple loading text for page content
if (isLoading) {
  return <div>Loading...</div>;
}

// ❌ NO! Don't use basic loading indicators for page sections
if (isLoading) {
  return <div className="text-center">Please wait...</div>;
}
```

#### **🏗️ Skeleton Best Practices**

**Component Structure & Organization:**

- **Colocate skeleton components** with their corresponding pages/components
  - Page skeletons: Define within the page file (e.g., `TasksPageSkeleton` in `tasks/page.tsx`)
  - Component skeletons: Define within the component file or near usage
  - NEVER create separate skeleton files (e.g., no `task-skeleton.tsx`)
- **Generic reusable skeletons**: Only in `@/components/skeletons.tsx` for truly global patterns
  - Examples: `CardSkeleton`, `FormSkeleton`, `UserSkeleton`, `TableRowSkeleton`
  - Use these as building blocks, but prefer page-specific skeleton composition
- Create dedicated `{PageName}Skeleton` components for each page
- Use realistic proportions that match actual content layout
- Include proper spacing and hierarchy with skeleton elements

### Design Philosophy - MANDATORY

**You are a senior product designer & front-end engineer with strong visual taste.**

Your goal is to produce **polished, modern, production-quality layouts**, not just functional UIs.

#### Design Principles You MUST Follow:

1. **Prioritize visual hierarchy** - Clear primary, secondary, and tertiary elements
2. **Use generous whitespace** - Consistent spacing scale, breathing room between sections
3. **Avoid over-nesting and unnecessary borders** - Keep layouts clean and uncluttered
4. **Prefer asymmetry and alignment** - Don't use grids everywhere; use intentional composition
5. **Default to simple, calm, editorial layouts** - Less is more
6. **Design for scannability** - Clear headlines, rhythm, breathing room
7. **Every screen should feel intentionally composed**, not "assembled"

#### Design Constraints:

- Use shadcn/ui components where appropriate
- Tailwind for spacing, typography, and layout
- **NO inline styles**
- **NO visual clutter**
- **NO unnecessary decorative elements** (separators, borders, icons unless explicitly needed)

#### Design Process (DO NOT SKIP):

Before implementing any UI component or page:

1. **Briefly explain the layout strategy and visual hierarchy**
   - What's the primary focus? Secondary elements?
   - How will the user's eye flow through the content?

2. **Describe spacing, alignment, and grouping decisions**
   - What spacing scale are you using? (e.g., `space-y-6`, `gap-4`)
   - How are elements grouped logically?
   - Where is whitespace being used intentionally?

3. **Then produce the React code**

#### Quality Standards:

- **If something looks "fine but boring", improve it**
- **If something looks crowded, remove elements**
- **Optimize for taste, not density**

**Skeleton Guidelines:**

- Match skeleton structure to actual content layout
- Use appropriate skeleton sizes (`h-4`, `h-6`, `h-8` for text)
- Include rounded corners for profile images (`rounded-full`)
- Use proper grid layouts for card-based content
- Animate skeletons with Shadcn's built-in pulse animation
- Match skeleton padding/spacing to actual component styles

| Criteria                       | 3                                                                                                                              | 4                                                                                                     | 5                                                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| UI/UX Design                   | Acceptable design with a basic layout; some minor usability issues may persist.                                                | Good design with clear visual hierarchy; most users find the experience intuitive.                    | Outstanding, user-centric UI/UX with an intuitive, attractive, and seamless interface that guides users effortlessly.                   |
| Accessibility                  | Basic accessibility in place (e.g., alt text and acceptable contrast), though full compliance isn't achieved.                  | Mostly accessible; adheres to most accessibility standards with only minor issues.                    | Fully accessible design that meets or exceeds WCAG 2.1 AA standards, ensuring every user can navigate the app effortlessly.             |
| Performance                    | Average load times; the app is usable but further optimizations could enhance user experience.                                 | Fast performance; most assets are optimized and pages load quickly on most connections.               | Exceptional performance with assets optimized to load in ~3 seconds or less, even on slower networks.                                   |
| Responsiveness                 | Generally responsive; most components reflow correctly, though a few minor issues may appear on uncommon screen sizes.         | Highly responsive; the design adapts well to a variety of devices with very few issues.               | Completely responsive; the layout and content seamlessly adapt to any screen size, ensuring a consistent experience across all devices. |
| Visual Consistency             | Moderately consistent; most design elements follow a common style guide with a few exceptions.                                 | Visually cohesive; nearly all UI elements align with a unified design language with minor deviations. | Total visual consistency; every component adheres to a unified design system, reinforcing the brand and improving user familiarity.     |
| Navigation & Usability         | Acceptable navigation; users can complete tasks but may experience a brief learning curve.                                     | Well-structured navigation with clear menus and labels; users find it easy to locate content.         | Exceptional navigation; an intuitive and streamlined interface ensures that users can find information quickly and easily.              |
| Mobile Optimization            | Mobile-friendly in most areas; the experience is acceptable though not fully polished for all mobile nuances.                  | Optimized for mobile; the design performs well on smartphones with only minor issues to address.      | Fully mobile-first; the app offers a smooth, fast, and engaging mobile experience with well-sized touch targets and rapid load times.   |
| Code Quality & Maintainability | Reasonable code quality; standard practices are mostly followed but could benefit from improved organization or documentation. | Clean, well-commented code adhering to modern best practices; relatively easy to maintain and scale.  | Exemplary code quality; modular, semantic, and thoroughly documented code ensures excellent maintainability and scalability.            |

**When building new components or updating existing ones, act as a world-class designer.**

Your job is to take this prototype and turn it into an impeccably designed web application.
This application should be in the top tier of applications and should be worthy of an Apple Design Award.
Use the Rubric guidelines as a guide. **You should ship only components that score 5 in each category.**

**Loading Hierarchy:**

```typescript
// Priority order for loading states:
// 1. Page skeleton (initial load)
// 2. Section skeletons (partial updates)
// 3. Button loading (user actions)
// 4. Inline spinners (small operations)
```

**Integration with TanStack Query:**

```typescript
// Always check isLoading state first
const { data, isLoading, error } = useQuery({ /* ... */ });

if (isLoading) return <PageSkeleton />;
if (error) return <ErrorComponent error={error} />;
return <PageContent data={data} />;
```

**Responsive Skeleton Design:**

- Ensure skeletons work across all screen sizes
- Use responsive utilities (`hidden sm:block`, `w-full sm:w-48`)
- Test skeleton appearance in both light and dark themes
- Match skeleton spacing to actual content spacing

#### **Color Usage - MANDATORY**

**NEVER use hardcoded colors. ALWAYS use CSS variables from the design system.**

- ✅ **Use Shadcn color tokens**: `text-primary`, `bg-secondary`, `border-input`, etc.
- ✅ **Use semantic color classes**: `text-destructive`, `text-muted-foreground`, `bg-accent`
- ✅ **Support dark mode**: CSS variables automatically adapt to theme
- ❌ **NEVER use hex colors**: No `#ffffff`, `#000000`, or any hex values
- ❌ **NEVER use rgb/rgba**: No `rgb(255, 255, 255)` or `rgba(0, 0, 0, 0.5)`
- ❌ **NEVER use Tailwind color scales**: No `bg-blue-500`, `text-red-600`, `border-gray-200`

```typescript
// ✅ CORRECT - Use CSS variables and semantic colors
<div className="bg-card text-card-foreground border-border">
  <p className="text-muted-foreground">Description</p>
  <Button variant="destructive">Delete</Button>
</div>

// ❌ WRONG - Hardcoded colors
<div className="bg-white text-black border-gray-200">
  <p className="text-gray-500">Description</p>
  <Button className="bg-red-500">Delete</Button>
</div>

// ❌ WRONG - Tailwind color scales
<div className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50">
  <p className="text-slate-600 dark:text-slate-400">Description</p>
</div>
```

**Available Shadcn Color Tokens:**

- **Background**: `bg-background`, `bg-foreground`, `bg-card`, `bg-popover`, `bg-primary`, `bg-secondary`, `bg-muted`, `bg-accent`, `bg-destructive`
- **Text**: `text-foreground`, `text-primary`, `text-secondary`, `text-muted-foreground`, `text-accent-foreground`, `text-destructive`, `text-destructive-foreground`
- **Border**: `border-border`, `border-input`, `border-ring`, `border-primary`, `border-destructive`

All color tokens are defined in `./app/globals.css` and support both light and dark themes automatically.
