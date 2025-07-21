import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ActivityType } from '@/lib/db/schema';
import {
  syncUserFromClerk,
  syncUserFromWebhook,
  getUserByClerkId,
  logUserActivity,
  ensureUserSynced,
  bulkSyncUsers,
  getSyncStats,
} from '@/lib/auth/user-sync';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  db: {
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn(),
      }),
    }),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn(),
      }),
    }),
    query: {
      users: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    },
  },
}));

jest.mock('@/lib/auth/utils', () => ({
  extractUserData: jest.fn(),
  extractUserDataFromWebhook: jest.fn(),
  hasUserChanges: jest.fn(),
  isSyncStale: jest.fn(),
  createActivityLogData: jest.fn(),
}));

import { db } from '@/lib/db';
import {
  extractUserData,
  extractUserDataFromWebhook,
  hasUserChanges,
  isSyncStale,
  createActivityLogData,
} from '@/lib/auth/utils';

const mockDb = db as any;
const mockExtractUserData = extractUserData as jest.MockedFunction<typeof extractUserData>;
const mockExtractUserDataFromWebhook = extractUserDataFromWebhook as jest.MockedFunction<
  typeof extractUserDataFromWebhook
>;
const mockHasUserChanges = hasUserChanges as jest.MockedFunction<typeof hasUserChanges>;
const mockIsSyncStale = isSyncStale as jest.MockedFunction<typeof isSyncStale>;
const mockCreateActivityLogData = createActivityLogData as jest.MockedFunction<
  typeof createActivityLogData
>;

describe('User Sync Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
  });

  describe('syncUserFromClerk', () => {
    const mockClerkUser = {
      id: 'user_123',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      firstName: 'John',
      lastName: 'Doe',
      fullName: 'John Doe',
      imageUrl: 'https://example.com/avatar.jpg',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const mockUserData = {
      clerkUserId: 'user_123',
      email: 'test@example.com',
      displayName: 'John Doe',
      profileImageUrl: 'https://example.com/avatar.jpg',
      lastSyncedAt: new Date(),
    };

    it('should create new user when none exists', async () => {
      mockDb.query.users.findFirst.mockResolvedValue(undefined);
      mockExtractUserData.mockReturnValue(mockUserData);

      const newUser = { id: 1, clerkUserId: 'user_123' };
      mockDb.insert().values().returning.mockResolvedValue([newUser]);

      const result = await syncUserFromClerk(mockClerkUser as any, { includeActivity: true });

      expect(result).toEqual(newUser);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockExtractUserData).toHaveBeenCalledWith(mockClerkUser);
    });

    it('should update existing user when data has changed', async () => {
      const existingUser = {
        id: 1,
        clerkUserId: 'user_123',
        email: 'old@example.com',
        displayName: 'Old Name',
        lastSyncedAt: new Date(),
      };

      mockDb.query.users.findFirst.mockResolvedValue(existingUser);
      mockExtractUserData.mockReturnValue(mockUserData);
      mockHasUserChanges.mockReturnValue(true);

      const result = await syncUserFromClerk(mockClerkUser);

      expect(result).toEqual({ id: 1, clerkUserId: 'user_123' });
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockHasUserChanges).toHaveBeenCalledWith(existingUser, mockUserData);
    });

    it('should only update sync timestamp when no data changes', async () => {
      const existingUser = {
        id: 1,
        clerkUserId: 'user_123',
        email: 'test@example.com',
        displayName: 'John Doe',
        lastSyncedAt: new Date(),
      };

      mockDb.query.users.findFirst.mockResolvedValue(existingUser);
      mockExtractUserData.mockReturnValue(mockUserData);
      mockHasUserChanges.mockReturnValue(false);

      const result = await syncUserFromClerk(mockClerkUser);

      expect(result).toEqual({ id: 1, clerkUserId: 'user_123' });
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should force sync when forceSync option is true', async () => {
      const existingUser = {
        id: 1,
        clerkUserId: 'user_123',
        email: 'test@example.com',
        displayName: 'John Doe',
        lastSyncedAt: new Date(),
      };

      mockDb.query.users.findFirst.mockResolvedValue(existingUser);
      mockExtractUserData.mockReturnValue(mockUserData);
      mockHasUserChanges.mockReturnValue(false);

      const result = await syncUserFromClerk(mockClerkUser, { forceSync: true });

      expect(result).toEqual({ id: 1, clerkUserId: 'user_123' });
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockDb.query.users.findFirst.mockRejectedValue(new Error('Database error'));

      await expect(syncUserFromClerk(mockClerkUser)).rejects.toThrow('Database error');
    });
  });

  describe('syncUserFromWebhook', () => {
    const mockWebhookUser = {
      id: 'user_123',
      email_addresses: [{ email_address: 'test@example.com' }],
      first_name: 'John',
      last_name: 'Doe',
      image_url: 'https://example.com/avatar.jpg',
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    const mockUserData = {
      clerkUserId: 'user_123',
      email: 'test@example.com',
      displayName: 'John Doe',
      profileImageUrl: 'https://example.com/avatar.jpg',
      lastSyncedAt: new Date(),
    };

    it('should sync user from webhook data', async () => {
      mockDb.query.users.findFirst.mockResolvedValue(undefined);
      mockExtractUserDataFromWebhook.mockReturnValue(mockUserData);

      const newUser = { id: 1, clerkUserId: 'user_123' };
      mockDb.insert().values().returning.mockResolvedValue([newUser]);

      const result = await syncUserFromWebhook(mockWebhookUser);

      expect(result).toEqual(newUser);
      expect(mockExtractUserDataFromWebhook).toHaveBeenCalledWith(mockWebhookUser);
    });

    it('should update existing user from webhook', async () => {
      const existingUser = {
        id: 1,
        clerkUserId: 'user_123',
        email: 'old@example.com',
        lastSyncedAt: new Date(),
      };

      mockDb.query.users.findFirst.mockResolvedValue(existingUser);
      mockExtractUserDataFromWebhook.mockReturnValue(mockUserData);
      mockHasUserChanges.mockReturnValue(true);

      const result = await syncUserFromWebhook(mockWebhookUser);

      expect(result).toEqual({ id: 1, clerkUserId: 'user_123' });
    });
  });

  describe('getUserByClerkId', () => {
    it('should return user when found', async () => {
      const mockUser = {
        id: 1,
        clerkUserId: 'user_123',
        email: 'test@example.com',
        displayName: 'John Doe',
      };

      mockDb.query.users.findFirst.mockResolvedValue(mockUser);

      const result = await getUserByClerkId('user_123');

      expect(result).toEqual(mockUser);
      expect(mockDb.query.users.findFirst).toHaveBeenCalled();
    });

    it('should return undefined when user not found', async () => {
      mockDb.query.users.findFirst.mockResolvedValue(undefined);

      const result = await getUserByClerkId('nonexistent_user');

      expect(result).toBeUndefined();
    });
  });

  describe('logUserActivity', () => {
    it('should log activity successfully', async () => {
      const mockActivityData = {
        clerkUserId: 'user_123',
        action: ActivityType.SIGN_IN,
        timestamp: new Date(),
        metadata: '{}',
      };

      mockCreateActivityLogData.mockReturnValue(mockActivityData);

      await logUserActivity('user_123', ActivityType.SIGN_IN, {}, '127.0.0.1');

      expect(mockCreateActivityLogData).toHaveBeenCalledWith(
        'user_123',
        ActivityType.SIGN_IN,
        {},
        '127.0.0.1'
      );
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should not throw on activity logging error', async () => {
      mockCreateActivityLogData.mockReturnValue({
        clerkUserId: 'user_123',
        action: ActivityType.SIGN_IN,
        timestamp: new Date(),
      });
      mockDb.insert().values.mockRejectedValue(new Error('Database error'));

      await expect(logUserActivity('user_123', ActivityType.SIGN_IN)).resolves.not.toThrow();
    });
  });

  describe('ensureUserSynced', () => {
    const mockClerkUser = {
      id: 'user_123',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      firstName: 'John',
      lastName: 'Doe',
      fullName: 'John Doe',
      imageUrl: 'https://example.com/avatar.jpg',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    it('should sync user when not found locally', async () => {
      mockDb.query.users.findFirst.mockResolvedValue(undefined);
      mockExtractUserData.mockReturnValue({
        clerkUserId: 'user_123',
        email: 'test@example.com',
        displayName: 'John Doe',
        profileImageUrl: 'https://example.com/avatar.jpg',
        lastSyncedAt: new Date(),
      });

      const newUser = { id: 1, clerkUserId: 'user_123' };
      mockDb.insert().values().returning.mockResolvedValue([newUser]);

      const result = await ensureUserSynced(mockClerkUser);

      expect(result).toEqual(newUser);
    });

    it('should sync user when sync is stale', async () => {
      const staleUser = {
        id: 1,
        clerkUserId: 'user_123',
        email: 'test@example.com',
        lastSyncedAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
      };

      mockDb.query.users.findFirst.mockResolvedValue(staleUser);
      mockIsSyncStale.mockReturnValue(true);
      mockExtractUserData.mockReturnValue({
        clerkUserId: 'user_123',
        email: 'test@example.com',
        displayName: 'John Doe',
        profileImageUrl: 'https://example.com/avatar.jpg',
        lastSyncedAt: new Date(),
      });
      mockHasUserChanges.mockReturnValue(false);

      const result = await ensureUserSynced(mockClerkUser);

      expect(result).toEqual({ id: 1, clerkUserId: 'user_123' });
      expect(mockIsSyncStale).toHaveBeenCalledWith(staleUser.lastSyncedAt);
    });

    it('should return existing user when sync is fresh', async () => {
      const freshUser = {
        id: 1,
        clerkUserId: 'user_123',
        email: 'test@example.com',
        lastSyncedAt: new Date(),
      };

      mockDb.query.users.findFirst.mockResolvedValue(freshUser);
      mockIsSyncStale.mockReturnValue(false);

      const result = await ensureUserSynced(mockClerkUser);

      expect(result).toEqual({ id: 1, clerkUserId: 'user_123' });
    });
  });

  describe('bulkSyncUsers', () => {
    const mockUsers = [
      {
        id: 'user_1',
        emailAddresses: [{ emailAddress: 'user1@example.com' }],
        firstName: 'User',
        lastName: 'One',
        fullName: 'User One',
        imageUrl: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'user_2',
        emailAddresses: [{ emailAddress: 'user2@example.com' }],
        firstName: 'User',
        lastName: 'Two',
        fullName: 'User Two',
        imageUrl: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    it('should sync multiple users successfully', async () => {
      mockDb.query.users.findFirst.mockResolvedValue(undefined);
      mockExtractUserData.mockReturnValue({
        clerkUserId: 'test',
        email: 'test@example.com',
        displayName: 'Test User',
        profileImageUrl: null,
        lastSyncedAt: new Date(),
      });

      mockDb
        .insert()
        .values()
        .returning.mockResolvedValue([{ id: 1, clerkUserId: 'user_1' }]);

      const results = await bulkSyncUsers(mockUsers);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('should handle individual sync failures', async () => {
      mockDb.query.users.findFirst
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Database error'));

      mockExtractUserData.mockReturnValue({
        clerkUserId: 'test',
        email: 'test@example.com',
        displayName: 'Test User',
        profileImageUrl: null,
        lastSyncedAt: new Date(),
      });

      mockDb
        .insert()
        .values()
        .returning.mockResolvedValue([{ id: 1, clerkUserId: 'user_1' }]);

      const results = await bulkSyncUsers(mockUsers);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe('Database error');
    });
  });

  describe('getSyncStats', () => {
    it('should return sync statistics', async () => {
      const mockUsers = [
        {
          id: 1,
          clerkUserId: 'user_1',
          lastSyncedAt: new Date(), // Recent
        },
        {
          id: 2,
          clerkUserId: 'user_2',
          lastSyncedAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago (stale)
        },
        {
          id: 3,
          clerkUserId: 'user_3',
          lastSyncedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago (recent)
        },
      ];

      mockDb.query.users.findMany.mockResolvedValue(mockUsers);
      mockIsSyncStale
        .mockReturnValueOnce(false) // user_1 - not stale
        .mockReturnValueOnce(true) // user_2 - stale
        .mockReturnValueOnce(false); // user_3 - not stale

      const result = await getSyncStats();

      expect(result).toEqual({
        totalUsers: 3,
        staleUsers: 1,
        recentlyUpdated: 2, // users synced within last 24 hours
      });
    });

    it('should handle errors gracefully', async () => {
      mockDb.query.users.findMany.mockRejectedValue(new Error('Database error'));

      await expect(getSyncStats()).rejects.toThrow('Database error');
    });
  });
});
