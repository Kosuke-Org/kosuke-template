---
sidebar_position: 5
---

# Code Quality

Maintaining high code quality with ESLint, TypeScript, and automated checks.

## Code Quality Tools

### ESLint

Catches common errors and enforces code style:

```bash
# Run ESLint
pnpm run lint

# Fix auto-fixable issues
pnpm run lint --fix
```

### TypeScript

Static type checking:

```bash
# Type check entire project
pnpm run typecheck
```

### Prettier

Consistent code formatting:

```bash
# Format all files
pnpm run format

# Check formatting
pnpm run format:check
```

## Pre-Commit Hooks

Automatic checks before each commit:

1. ESLint validation
2. TypeScript type checking
3. Prettier formatting
4. Test suite

If any fail, commit is blocked.

## TypeScript Configuration

### Strict Mode

Kosuke Template uses strict TypeScript:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitAny": true
  }
}
```

### Benefits

- Catch errors at compile time
- Better IDE autocomplete
- Safer refactoring
- Self-documenting code

## ESLint Rules

Key rules enforced:

- No unused variables
- No unused imports
- Consistent naming
- React hooks rules
- Next.js best practices
- Accessibility checks

## Code Style

### Naming Conventions

```typescript
// Components: PascalCase
export function UserProfile() {}

// Functions: camelCase
export function getUserData() {}

// Constants: UPPER_SNAKE_CASE
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Types: PascalCase
interface UserProfile {}
type SubscriptionTier = 'free' | 'pro';
```

### Import Order

```typescript
// 1. React
import { useState } from 'react';

// 2. External libraries
import { Button } from '@/components/ui/button';

// 3. Internal utilities
import { db } from '@/lib/db/drizzle';

// 4. Types
import type { User } from '@/lib/types';

// 5. Styles
import styles from './styles.module.css';
```

### File Organization

```typescript
// 1. Imports
// 2. Types
// 3. Component
// 4. Exports

import { Button } from '@/components/ui/button';
import type { User } from '@/lib/types';

interface Props {
  user: User;
}

export function UserCard({ user }: Props) {
  return <div>{user.email}</div>;
}
```

## Best Practices

### Type Safety

```typescript
// ✅ Good: Explicit types
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ❌ Avoid: Implicit any
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

### Error Handling

```typescript
// ✅ Good: Specific error types
try {
  await saveData();
} catch (error) {
  if (error instanceof DatabaseError) {
    // Handle database error
  } else {
    // Handle other errors
  }
}
```

### Async/Await

```typescript
// ✅ Good: Async/await
async function getData() {
  const response = await fetch('/api/data');
  const data = await response.json();
  return data;
}

// ❌ Avoid: Promise chains (unless needed)
function getData() {
  return fetch('/api/data')
    .then((res) => res.json())
    .then((data) => data);
}
```

## Code Review

### Checklist

- [ ] Types are explicit
- [ ] No eslint warnings
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No console.logs
- [ ] Error handling implemented
- [ ] Edge cases covered

### Common Issues

**Unused Variables**:

```typescript
// ❌ Bad
const unused = getData();

// ✅ Good
void getData(); // Explicitly mark as unused
```

**Missing Return Types**:

```typescript
// ❌ Bad
async function getData() {
  return fetch('/api/data');
}

// ✅ Good
async function getData(): Promise<Data> {
  const res = await fetch('/api/data');
  return res.json();
}
```

## Performance

### Bundle Size

Monitor with:

```bash
# Build and analyze
pnpm run build

# Check bundle size in output
```

### Code Splitting

```typescript
// Dynamic imports for large components
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./heavy-component'), {
  loading: () => <Skeleton />,
});
```

## Documentation

### JSDoc Comments

```typescript
/**
 * Retrieves user subscription from database
 * @param userId - Clerk user ID
 * @returns User subscription or null
 */
export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  // ...
}
```

### README Files

Add README.md in complex directories:

- Explain purpose
- Document patterns
- Provide examples

## Continuous Improvement

### Regular Tasks

**Weekly**:

- Run security audit: `pnpm audit`
- Check for updates: `pnpm outdated`

**Monthly**:

- Update dependencies
- Review code quality metrics
- Refactor technical debt

**Quarterly**:

- Major version updates
- Architecture review
- Performance audit

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [React Best Practices](https://react.dev/learn)
- [Next.js Best Practices](https://nextjs.org/docs)
