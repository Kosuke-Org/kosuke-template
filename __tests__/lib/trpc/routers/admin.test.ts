import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockTRPCContext } from '@/__tests__/setup/mocks';

import { createCaller } from '@/lib/trpc/server';
import { USER_ROLES } from '@/lib/types/organization';

vi.mock('@/lib/auth/providers', () => ({
  auth: {
    api: {
      listUsers: vi.fn(),
      adminUpdateUser: vi.fn(),
      revokeUserSessions: vi.fn(),
      removeUser: vi.fn(),
    },
  },
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({})),
}));

describe('Admin Router', () => {
  let caller: Awaited<ReturnType<typeof createCaller>>;
  let auth: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const adminUserId = 'admin_123';
  const regularUserId = 'user_123';
  const testUserId = '223e4567-e89b-12d3-a456-426614174000';

  beforeEach(async () => {
    vi.clearAllMocks();

    ({ auth } = await import('@/lib/auth/providers'));
  });

  describe('superAdminProcedure authorization', () => {
    it('allows admin users to access admin routes', async () => {
      const ctx = await createMockTRPCContext({
        userId: adminUserId,
        getUser: async () => ({
          id: adminUserId,
          email: 'admin@example.com',
          emailVerified: true,
          name: 'Admin User',
          role: USER_ROLES.ADMIN,
          image: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          banned: false,
        }),
      });

      caller = await createCaller(ctx);

      auth.api.listUsers.mockResolvedValue({ users: [], total: 0 });
      await expect(caller.admin.users.list()).resolves.toBeDefined();
    });

    it('throws FORBIDDEN for non-admin users', async () => {
      const ctx = await createMockTRPCContext({
        userId: regularUserId,
        getUser: async () => ({
          id: regularUserId,
          email: 'user@example.com',
          emailVerified: true,
          name: 'Regular User',
          role: USER_ROLES.USER,
          image: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          banned: false,
        }),
      });

      caller = await createCaller(ctx);

      await expect(caller.admin.users.list()).rejects.toThrow(/Admin access required/);
    });

    it('throws UNAUTHORIZED for unauthenticated users', async () => {
      const ctx = await createMockTRPCContext({ userId: null });
      caller = await createCaller(ctx);

      await expect(caller.admin.users.list()).rejects.toThrow(
        /You must be logged in to perform this action/
      );
    });
  });

  describe('users.list', () => {
    beforeEach(async () => {
      const ctx = await createMockTRPCContext({
        userId: adminUserId,
        getUser: async () => ({
          id: adminUserId,
          email: 'admin@example.com',
          emailVerified: true,
          name: 'Admin User',
          role: USER_ROLES.ADMIN,
          image: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          banned: false,
        }),
      });
      caller = await createCaller(ctx);
    });

    it('lists users with pagination', async () => {
      auth.api.listUsers.mockResolvedValue({
        users: [
          {
            id: testUserId,
            email: 'test@example.com',
            name: 'Test User',
            emailVerified: true,
            role: 'user',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        total: 1,
      });

      const result = await caller.admin.users.list({ page: 1, pageSize: 10 });

      expect(result.users).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('filters users by search query', async () => {
      auth.api.listUsers.mockResolvedValue({
        users: [
          {
            id: testUserId,
            email: 'test@example.com',
            name: 'Test User',
            emailVerified: true,
            role: 'user',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        total: 1,
      });

      await caller.admin.users.list({ searchQuery: 'test@example.com' });

      expect(auth.api.listUsers).toHaveBeenCalledWith({
        query: expect.objectContaining({
          searchValue: 'test@example.com',
          searchField: 'email',
          searchOperator: 'contains',
        }),
        headers: expect.any(Object),
      });
    });
  });

  describe('users.update', () => {
    beforeEach(async () => {
      const ctx = await createMockTRPCContext({
        userId: adminUserId,
        getUser: async () => ({
          id: adminUserId,
          email: 'admin@example.com',
          emailVerified: true,
          name: 'Admin User',
          role: USER_ROLES.ADMIN,
          image: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          banned: false,
        }),
      });
      caller = await createCaller(ctx);
    });

    it('updates user details', async () => {
      auth.api.adminUpdateUser.mockResolvedValue({});

      const result = await caller.admin.users.update({
        id: testUserId,
        displayName: 'Updated Name',
      });

      expect(result.success).toBe(true);
      expect(auth.api.adminUpdateUser).toHaveBeenCalledWith({
        body: {
          userId: testUserId,
          data: { displayName: 'Updated Name' },
        },
        headers: expect.any(Object),
      });
    });

    it('revokes sessions when role is updated', async () => {
      auth.api.adminUpdateUser.mockResolvedValue({});
      auth.api.revokeUserSessions.mockResolvedValue({});

      await caller.admin.users.update({
        id: testUserId,
        role: 'admin',
      });

      expect(auth.api.revokeUserSessions).toHaveBeenCalledWith({
        body: { userId: testUserId },
        headers: expect.any(Object),
      });
    });
  });

  describe('users.delete', () => {
    beforeEach(async () => {
      const ctx = await createMockTRPCContext({
        userId: adminUserId,
        getUser: async () => ({
          id: adminUserId,
          email: 'admin@example.com',
          emailVerified: true,
          name: 'Admin User',
          role: USER_ROLES.ADMIN,
          image: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          banned: false,
        }),
      });
      caller = await createCaller(ctx);
    });

    it('deletes a user', async () => {
      auth.api.revokeUserSessions.mockResolvedValue({});
      auth.api.removeUser.mockResolvedValue({});

      await caller.admin.users.delete({ id: testUserId });

      expect(auth.api.revokeUserSessions).toHaveBeenCalledWith({
        body: { userId: testUserId },
        headers: expect.any(Object),
      });
      expect(auth.api.removeUser).toHaveBeenCalledWith({
        body: { userId: testUserId },
        headers: expect.any(Object),
      });
    });
  });
});
