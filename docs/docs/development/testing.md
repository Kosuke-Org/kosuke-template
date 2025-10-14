---
sidebar_position: 2
---

# Testing

Testing strategy and guide for Kosuke Template using Vitest and React Testing Library.

## Testing Stack

- **Vitest**: Fast unit test runner
- **React Testing Library**: Test React components
- **Testing Library User Event**: Simulate user interactions
- **MSW**: Mock Service Worker for API mocking (optional)

## Running Tests

```bash
# Run all tests
pnpm test

# Watch mode (reruns on file changes)
pnpm run test:watch

# Coverage report
pnpm run test:coverage
```

## Test Structure

### Location

Tests are located in `__tests__/` directory:

```
__tests__/
├── hooks/               # Hook tests
│   ├── use-auth-actions.test.tsx
│   └── use-tasks.test.tsx
├── lib/                 # Utility tests
│   ├── auth/
│   └── billing/
└── setup/               # Test setup and mocks
    ├── database.ts
    ├── factories.ts
    └── mocks.ts
```

### Test Files

Name test files with `.test.ts` or `.test.tsx`:

```
ComponentName.tsx → ComponentName.test.tsx
utils.ts → utils.test.ts
```

## Writing Tests

### Testing Hooks

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useAuth } from '@/hooks/use-auth';

describe('useAuth', () => {
  it('should return user data', async () => {
    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.user).toBeDefined();
    });
  });
});
```

### Testing Components

```typescript
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('should render with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```

### Testing API Routes

```typescript
import { POST } from '@/app/api/billing/webhook/route';

describe('Billing Webhook', () => {
  it('should process subscription.created event', async () => {
    const request = new Request('http://localhost/api/billing/webhook', {
      method: 'POST',
      body: JSON.stringify(mockEvent),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});
```

## Mocking

### Mock External Services

```typescript
import { vi } from 'vitest';

// Mock Clerk
vi.mock('@clerk/nextjs', () => ({
  auth: vi.fn(() => ({ userId: 'test-user-id' })),
  currentUser: vi.fn(() => ({ id: 'test-user-id' })),
}));

// Mock database
vi.mock('@/lib/db/drizzle', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));
```

### Mock Hooks

```typescript
import { vi } from 'vitest';

vi.mock('@/hooks/use-subscription', () => ({
  useSubscription: () => ({
    subscription: { tier: 'pro' },
    isLoading: false,
  }),
}));
```

## Test Coverage

### View Coverage

```bash
pnpm run test:coverage
```

Opens HTML report in `coverage/` directory.

### Coverage Goals

- **Overall**: > 80%
- **Critical paths**: > 90%
- **Utilities**: > 95%
- **UI Components**: > 70%

### What to Test

**High Priority**:

- Authentication logic
- Billing operations
- Database queries
- API endpoints
- Webhook handlers

**Medium Priority**:

- Custom hooks
- Utility functions
- Form validation

**Low Priority**:

- UI components (covered by E2E)
- Simple presentational components

## Best Practices

### 1. Test Behavior, Not Implementation

```typescript
// ✅ Good: Tests behavior
it('should show error message when form is invalid', () => {
  render(<LoginForm />);
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
  expect(screen.getByText(/email is required/i)).toBeInTheDocument();
});

// ❌ Bad: Tests implementation
it('should call validateEmail function', () => {
  const spy = vi.spyOn(utils, 'validateEmail');
  // ...
  expect(spy).toHaveBeenCalled();
});
```

### 2. Use Testing Library Queries

```typescript
// ✅ Good: Accessible queries
screen.getByRole('button', { name: /submit/i });
screen.getByLabelText(/email/i);
screen.getByText(/welcome/i);

// ❌ Avoid: Test IDs (unless necessary)
screen.getByTestId('submit-button');
```

### 3. Async Testing

```typescript
import { waitFor } from '@testing-library/react';

// ✅ Good: Wait for async operations
await waitFor(() => {
  expect(screen.getByText(/success/i)).toBeInTheDocument();
});
```

### 4. Clean Up

```typescript
afterEach(() => {
  vi.clearAllMocks();
  cleanup();
});
```

## Continuous Integration

Tests run automatically in CI/CD:

### Pre-commit Hooks

```bash
# Runs before each commit
pnpm run lint
pnpm run typecheck
pnpm test
```

### GitHub Actions (Optional)

Add `.github/workflows/test.yml`:

```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test
```

## Debugging Tests

### Run Single Test

```bash
# Run specific test file
pnpm test use-auth.test.tsx

# Run tests matching pattern
pnpm test --grep "authentication"
```

### Debug in VS Code

Create `.vscode/launch.json`:

```json
{
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Vitest",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["test"],
      "console": "integratedTerminal"
    }
  ]
}
```

## Next Steps

Learn about database operations:

👉 **[Database Operations](./database-operations)**
