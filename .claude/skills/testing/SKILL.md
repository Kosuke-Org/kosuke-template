---
name: testing
description: Vitest testing reference - testing priority order, the mandatory mock-the-database pattern for service tests, Drizzle query mock chains for select/insert/update/delete, and why to assert on the exact selected fields. Load when writing or fixing tests under __tests__/.
---

# Testing (Vitest)

```bash
bun run test           # Run tests
bun run test:watch     # Watch mode
bun run test:coverage  # Coverage report
```

- **Service Tests (PRIORITY)**: Test business logic in `lib/services/` with Vitest
  - **ALWAYS use mocks** - Mock database operations with Vitest
  - Fast execution (no real database I/O)
  - Isolated tests (no side effects or cleanup needed)
  - Test file location: `__tests__/lib/services/{domain}-service.test.ts`
- **Unit Tests**: Vitest for utility functions and components
- **Integration Tests**: tRPC routers (thin layer, less critical)
- **Mocking**: Use Vitest (`vi`) to mock database, Better Auth, Stripe, Resend APIs
- **Coverage**: Maintain good test coverage for critical paths (focus on services)
- **E2E**: Consider Playwright for critical user flows

**Testing Priority:**

1. **Services** - Highest priority (business logic, database operations)
2. **Utilities** - Medium priority (helper functions, transformations)
3. **Components** - Medium priority (UI logic, user interactions)
4. **tRPC Routers** - Lower priority (thin layer, mostly validation)

**Service Testing Best Practices - MANDATORY:**

**✅ DO:**

- Mock the database using Vitest (`vi.mock`)
- Test business logic and edge cases
- Test error handling
- Test authorization checks
- **Validate selected fields** - Verify the correct fields are being queried
- Use descriptive test names
- Clear mocks between tests (`vi.clearAllMocks()`)
- Restore mocks after tests (`vi.restoreAllMocks()`)

**❌ DON'T:**

- Create real database records in tests
- Rely on database state from previous tests
- Skip cleanup (mocks handle this automatically)
- Test database internals (test service behavior)
- Use real database connections in unit tests

**Mock Pattern for Drizzle Queries:**

```typescript
// Mock SELECT query
const mockSelect = vi.fn().mockReturnValue({
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue([mockData]),
    }),
  }),
});
vi.mocked(db.select).mockImplementation(mockSelect);

// Mock INSERT query
const mockInsert = vi.fn().mockReturnValue({
  values: vi.fn().mockReturnValue({
    returning: vi.fn().mockResolvedValue([mockData]),
  }),
});
vi.mocked(db.insert).mockImplementation(mockInsert);

// Mock UPDATE query
const mockUpdate = vi.fn().mockReturnValue({
  set: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([mockData]),
    }),
  }),
});
vi.mocked(db.update).mockImplementation(mockUpdate);

// Mock DELETE query
const mockDelete = vi.fn().mockReturnValue({
  where: vi.fn().mockResolvedValue(undefined),
});
vi.mocked(db.delete).mockImplementation(mockDelete);
```

**Why Validate Selected Fields?**

Validating the exact fields being selected in your tests ensures:

- ✅ **Schema Compliance** - Service queries match the database schema
- ✅ **No Missing Fields** - All required fields are being fetched
- ✅ **No Extra Fields** - Prevents over-fetching unnecessary data
- ✅ **Type Safety** - Catches field name typos or schema changes
- ✅ **Documentation** - Tests serve as documentation of data structure
- ✅ **Regression Prevention** - Detects when fields are accidentally removed

```typescript
// ✅ CORRECT - Validate selected fields
expect(db.select).toHaveBeenCalledWith({
  id: expect.anything(),
  email: expect.anything(),
  emailVerified: expect.anything(),
  displayName: expect.anything(),
  profileImageUrl: expect.anything(),
  role: expect.anything(),
  createdAt: expect.anything(),
  updatedAt: expect.anything(),
});

// ❌ WRONG - Only checking if select was called
expect(db.select).toHaveBeenCalled(); // Doesn't validate structure
```

```typescript
// __tests__/lib/services/task-service.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/lib/db/drizzle';
import * as taskService from '@/lib/services/task-service';

// Mock the database
vi.mock('@/lib/db/drizzle', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('TaskService', () => {
  const mockUserId = 'user-123';
  const mockTaskId = 'task-456';
  const mockTask = {
    id: mockTaskId,
    userId: mockUserId,
    title: 'Test Task',
    description: 'Test Description',
    completed: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createTask', () => {
    it('should create a task', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockTask]),
        }),
      });
      vi.mocked(db.insert).mockImplementation(mockInsert);

      const result = await taskService.createTask(mockUserId, {
        title: 'Test Task',
        description: 'Test Description',
      });

      expect(result).toEqual(mockTask);
      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe('updateTask', () => {
    it('should update task when user owns it', async () => {
      // Mock select to verify ownership
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockTask]),
          }),
        }),
      });
      vi.mocked(db.select).mockImplementation(mockSelect);

      // Mock update
      const updatedTask = { ...mockTask, title: 'Updated Task' };
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedTask]),
          }),
        }),
      });
      vi.mocked(db.update).mockImplementation(mockUpdate);

      const result = await taskService.updateTask(mockUserId, mockTaskId, {
        title: 'Updated Task',
      });

      expect(result.title).toBe('Updated Task');
      expect(db.select).toHaveBeenCalled();
      expect(db.update).toHaveBeenCalled();
    });

    it('should throw error when user does not own task', async () => {
      // Mock select returning empty (task not found or not owned)
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      vi.mocked(db.select).mockImplementation(mockSelect);

      await expect(
        taskService.updateTask('different-user-id', mockTaskId, { title: 'Hacked' })
      ).rejects.toThrow('Task not found or access denied');

      expect(db.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteTask', () => {
    it('should delete task when user owns it', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockTask]),
          }),
        }),
      });
      vi.mocked(db.select).mockImplementation(mockSelect);

      const mockDelete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });
      vi.mocked(db.delete).mockImplementation(mockDelete);

      await taskService.deleteTask(mockUserId, mockTaskId);

      expect(db.delete).toHaveBeenCalled();
    });
  });
});
```

## Full worked example: user-service

**ALWAYS use mocks for service tests. NEVER create real database records in tests.**

```typescript
// __tests__/lib/services/user-service.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/lib/db/drizzle';
import * as userService from '@/lib/services/user-service';

// Mock the database
vi.mock('@/lib/db/drizzle', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('UserService', () => {
  const mockUserId = 'user-123';
  const mockUser = {
    id: mockUserId,
    email: 'test@example.com',
    emailVerified: true,
    displayName: 'Test User',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      // Mock the database query chain
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      });
      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await userService.getUserById(mockUserId);

      expect(result).toEqual(mockUser);
      expect(db.select).toHaveBeenCalled();

      // ✅ BEST PRACTICE: Validate the exact fields being selected
      expect(db.select).toHaveBeenCalledWith({
        id: expect.anything(),
        email: expect.anything(),
        emailVerified: expect.anything(),
        displayName: expect.anything(),
        profileImageUrl: expect.anything(),
        stripeCustomerId: expect.anything(),
        role: expect.anything(),
        createdAt: expect.anything(),
        updatedAt: expect.anything(),
      });
    });

    it('should return null when user not found', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await userService.getUserById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getNotificationSettings', () => {
    it('should create default settings if none exist', async () => {
      const mockDefaults = {
        emailNotifications: true,
        marketingEmails: false,
        securityAlerts: true,
      };

      // Mock select returning empty (no existing settings)
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      vi.mocked(db.select).mockImplementation(mockSelect);

      // Mock insert for creating defaults
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });
      vi.mocked(db.insert).mockImplementation(mockInsert);

      const result = await userService.getNotificationSettings(mockUserId);

      expect(result).toEqual(mockDefaults);
      expect(db.insert).toHaveBeenCalled();
    });

    it('should return existing settings', async () => {
      const mockSettings = {
        emailNotifications: false,
        marketingEmails: true,
        securityAlerts: false,
      };

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockSettings]),
          }),
        }),
      });
      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await userService.getNotificationSettings(mockUserId);

      expect(result).toEqual(mockSettings);
      expect(db.insert).not.toHaveBeenCalled();
    });
  });

  describe('updateNotificationSettings', () => {
    it('should update settings', async () => {
      const updates = { emailNotifications: false };
      const mockUpdated = {
        emailNotifications: false,
        marketingEmails: false,
        securityAlerts: true,
      };

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockUpdated]),
          }),
        }),
      });
      vi.mocked(db.update).mockImplementation(mockUpdate);

      const result = await userService.updateNotificationSettings(mockUserId, updates);

      expect(result).toEqual(mockUpdated);
      expect(db.update).toHaveBeenCalled();
    });

    it('should throw error when update fails', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      vi.mocked(db.update).mockImplementation(mockUpdate);

      await expect(
        userService.updateNotificationSettings(mockUserId, { emailNotifications: false })
      ).rejects.toThrow('Failed to update notification settings');
    });
  });
});
```

---

## Appendix: superseded integration-test example (do not copy)

The version of this document before the 2026 restructure contained a **second** service-testing
example that created real database rows in `beforeEach`. It directly contradicts the mandatory
rule above ("ALWAYS use mocks … NEVER create real database records in tests"), so the mocked
pattern is authoritative. It is retained here only so the history is not lost — **do not use it
as a template for new tests.**

```typescript
// __tests__/lib/services/user-service.test.ts
import { beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/lib/db/drizzle';
import { notificationSettings, users } from '@/lib/db/schema';
import * as userService from '@/lib/services/user-service';

describe('UserService', () => {
  let testUserId: string;

  beforeEach(async () => {
    // Setup: Create test user
    const [user] = await db
      .insert(users)
      .values({
        email: 'test@example.com',
        emailVerified: false,
      })
      .returning();
    testUserId = user.id;
  });

  describe('getNotificationSettings', () => {
    it('should create default settings if none exist', async () => {
      const settings = await userService.getNotificationSettings(testUserId);

      expect(settings).toEqual({
        emailNotifications: true,
        marketingEmails: false,
        securityAlerts: true,
      });
    });

    it('should return existing settings', async () => {
      // Create settings
      await db.insert(notificationSettings).values({
        userId: testUserId,
        emailNotifications: false,
        marketingEmails: true,
        securityAlerts: false,
      });

      const settings = await userService.getNotificationSettings(testUserId);

      expect(settings.emailNotifications).toBe(false);
      expect(settings.marketingEmails).toBe(true);
      expect(settings.securityAlerts).toBe(false);
    });
  });

  describe('updateNotificationSettings', () => {
    it('should update notification settings', async () => {
      // Create initial settings
      await userService.getNotificationSettings(testUserId);

      // Update
      const updated = await userService.updateNotificationSettings(testUserId, {
        emailNotifications: false,
      });

      expect(updated.emailNotifications).toBe(false);
      expect(updated.marketingEmails).toBe(false); // Unchanged
      expect(updated.securityAlerts).toBe(true); // Unchanged
    });
  });
});
```
