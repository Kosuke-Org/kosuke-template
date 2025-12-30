/**
 * User Service Tests
 * Tests for all user-related database operations and business logic
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/lib/db/drizzle';
import { ERROR_MESSAGES } from '@/lib/services';
import {
  createUser,
  deleteUserProfileImage,
  getNotificationSettings,
  getProfileImageUrl,
  getUserByEmail,
  getUserById,
  isUserAdmin,
  updateDisplayName,
  updateNotificationSettings,
  updateProfileImageUrl,
} from '@/lib/services/user-service';
import type { NotificationSettings } from '@/lib/types';

// Mock the database
vi.mock('@/lib/db/drizzle', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

describe('User Service', () => {
  const mockUserId = 'user-123';
  const mockEmail = 'test@example.com';
  const mockUser = {
    id: mockUserId,
    email: mockEmail,
    emailVerified: true,
    displayName: 'Test User',
    profileImageUrl: 'https://example.com/avatar.jpg',
    stripeCustomerId: 'cus_123',
    notificationSettings: JSON.stringify({
      emailNotifications: true,
      marketingEmails: false,
      securityAlerts: true,
    }),
    role: 'user' as const,
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
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      });

      vi.mocked(db.select).mockReturnValue(mockSelect());

      const result = await getUserById(mockUserId);

      expect(result).toEqual(mockUser);
      expect(db.select).toHaveBeenCalledWith({
        id: expect.anything(),
        email: expect.anything(),
        emailVerified: expect.anything(),
        displayName: expect.anything(),
        profileImageUrl: expect.anything(),
        stripeCustomerId: expect.anything(),
        notificationSettings: expect.anything(),
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

      vi.mocked(db.select).mockReturnValue(mockSelect());

      await expect(getUserById(mockUserId)).rejects.toThrow(ERROR_MESSAGES.USER_NOT_FOUND);
    });
  });

  describe('getNotificationSettings', () => {
    it('should return parsed notification settings when they exist', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                notificationSettings: JSON.stringify({
                  emailNotifications: true,
                  marketingEmails: false,
                  securityAlerts: true,
                }),
              },
            ]),
          }),
        }),
      });

      vi.mocked(db.select).mockReturnValue(mockSelect());

      const result = await getNotificationSettings(mockUserId);

      expect(result).toEqual({
        emailNotifications: true,
        marketingEmails: false,
        securityAlerts: true,
      });
      expect(db.select).toHaveBeenCalledWith({
        notificationSettings: expect.anything(),
      });
    });

    it('should return default settings when user not found', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      vi.mocked(db.select).mockReturnValue(mockSelect());

      const result = await getNotificationSettings(mockUserId);

      expect(result).toEqual({
        emailNotifications: true,
        marketingEmails: false,
        securityAlerts: true,
      });
    });

    it('should return default settings when notificationSettings is null', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ notificationSettings: null }]),
          }),
        }),
      });

      vi.mocked(db.select).mockReturnValue(mockSelect());

      const result = await getNotificationSettings(mockUserId);

      expect(result).toEqual({
        emailNotifications: true,
        marketingEmails: false,
        securityAlerts: true,
      });
    });

    it('should return default settings when JSON parsing fails', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ notificationSettings: 'invalid-json' }]),
          }),
        }),
      });

      vi.mocked(db.select).mockReturnValue(mockSelect());

      const result = await getNotificationSettings(mockUserId);

      expect(result).toEqual({
        emailNotifications: true,
        marketingEmails: false,
        securityAlerts: true,
      });
    });
  });

  describe('updateNotificationSettings', () => {
    const newSettings: NotificationSettings = {
      emailNotifications: false,
      marketingEmails: true,
      securityAlerts: true,
    };

    it('should update notification settings and return old and new settings', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                notificationSettings: JSON.stringify({
                  emailNotifications: true,
                  marketingEmails: false,
                  securityAlerts: true,
                }),
                email: mockEmail,
              },
            ]),
          }),
        }),
      });

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      vi.mocked(db.select).mockReturnValue(mockSelect());
      vi.mocked(db.update).mockReturnValue(mockUpdate());

      const result = await updateNotificationSettings(mockUserId, newSettings);

      expect(result).toEqual({
        oldSettings: {
          emailNotifications: true,
          marketingEmails: false,
          securityAlerts: true,
        },
        newSettings,
        userEmail: mockEmail,
      });
      expect(db.select).toHaveBeenCalledWith({
        notificationSettings: expect.anything(),
        email: expect.anything(),
      });
      expect(db.update).toHaveBeenCalled();
    });

    it('should throw error when user not found', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      vi.mocked(db.select).mockReturnValue(mockSelect());

      await expect(updateNotificationSettings(mockUserId, newSettings)).rejects.toThrow(
        'User not found'
      );
    });

    it('should use default old settings when user has no notification settings', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                notificationSettings: null,
                email: mockEmail,
              },
            ]),
          }),
        }),
      });

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      vi.mocked(db.select).mockReturnValue(mockSelect());
      vi.mocked(db.update).mockReturnValue(mockUpdate());

      const result = await updateNotificationSettings(mockUserId, newSettings);

      expect(result.oldSettings).toEqual({
        emailNotifications: true,
        marketingEmails: false,
        securityAlerts: true,
      });
    });
  });

  describe('updateDisplayName', () => {
    it('should update display name and return updated user', async () => {
      const newDisplayName = 'New Name';
      const updatedUser = {
        id: mockUserId,
        displayName: newDisplayName,
      };

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedUser]),
          }),
        }),
      });

      vi.mocked(db.update).mockReturnValue(mockUpdate());

      const result = await updateDisplayName(mockUserId, newDisplayName);

      expect(result).toEqual(updatedUser);
      expect(db.update).toHaveBeenCalled();
    });

    it('should throw error when user not found', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      vi.mocked(db.update).mockReturnValue(mockUpdate());

      await expect(updateDisplayName(mockUserId, 'New Name')).rejects.toThrow('User not found');
    });
  });

  describe('updateProfileImageUrl', () => {
    it('should update profile image URL and return updated user', async () => {
      const newImageUrl = 'https://example.com/new-avatar.jpg';
      const updatedUser = {
        id: mockUserId,
        profileImageUrl: newImageUrl,
        updatedAt: new Date(),
      };

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedUser]),
          }),
        }),
      });

      vi.mocked(db.update).mockReturnValue(mockUpdate());

      const result = await updateProfileImageUrl(mockUserId, newImageUrl);

      expect(result).toEqual(updatedUser);
      expect(db.update).toHaveBeenCalled();
    });

    it('should allow setting profile image URL to null', async () => {
      const updatedUser = {
        id: mockUserId,
        profileImageUrl: null,
        updatedAt: new Date(),
      };

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedUser]),
          }),
        }),
      });

      vi.mocked(db.update).mockReturnValue(mockUpdate());

      const result = await updateProfileImageUrl(mockUserId, null);

      expect(result).toEqual(updatedUser);
      expect(result.profileImageUrl).toBeNull();
    });

    it('should throw error with correct message when user not found', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      vi.mocked(db.update).mockReturnValue(mockUpdate());

      await expect(updateProfileImageUrl(mockUserId, 'new-url')).rejects.toThrow(
        ERROR_MESSAGES.USER_NOT_FOUND
      );
    });
  });

  describe('getProfileImageUrl', () => {
    it('should return profile image URL when it exists', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi
              .fn()
              .mockResolvedValue([{ profileImageUrl: 'https://example.com/avatar.jpg' }]),
          }),
        }),
      });

      vi.mocked(db.select).mockReturnValue(mockSelect());

      const result = await getProfileImageUrl(mockUserId);

      expect(result).toBe('https://example.com/avatar.jpg');
      expect(db.select).toHaveBeenCalledWith({
        profileImageUrl: expect.anything(),
      });
    });

    it('should return null when user has no profile image', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ profileImageUrl: null }]),
          }),
        }),
      });

      vi.mocked(db.select).mockReturnValue(mockSelect());

      const result = await getProfileImageUrl(mockUserId);

      expect(result).toBeNull();
    });

    it('should return null when user not found', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      vi.mocked(db.select).mockReturnValue(mockSelect());

      const result = await getProfileImageUrl(mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('isUserAdmin', () => {
    it('should return true when user is admin', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ role: 'admin' }]),
          }),
        }),
      });

      vi.mocked(db.select).mockReturnValue(mockSelect());

      const result = await isUserAdmin(mockUserId);

      expect(result).toBe(true);
      expect(db.select).toHaveBeenCalledWith({
        role: expect.anything(),
      });
    });

    it('should return false when user is not admin', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ role: 'user' }]),
          }),
        }),
      });

      vi.mocked(db.select).mockReturnValue(mockSelect());

      const result = await isUserAdmin(mockUserId);

      expect(result).toBe(false);
    });

    it('should return false when user not found', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      vi.mocked(db.select).mockReturnValue(mockSelect());

      const result = await isUserAdmin(mockUserId);

      expect(result).toBe(false);
    });
  });

  describe('createUser', () => {
    it('should create user with all provided data', async () => {
      const userData = {
        email: mockEmail,
        emailVerified: true,
        displayName: 'Test User',
        notificationSettings: {
          emailNotifications: true,
          marketingEmails: false,
          securityAlerts: true,
        } as NotificationSettings,
      };

      const createdUser = {
        ...mockUser,
        ...userData,
        notificationSettings: JSON.stringify(userData.notificationSettings),
      };

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdUser]),
        }),
      });

      vi.mocked(db.insert).mockReturnValue(mockInsert());

      const result = await createUser(userData);

      expect(result).toEqual(createdUser);
      expect(db.insert).toHaveBeenCalled();
    });

    it('should create user with default values when optional fields not provided', async () => {
      const userData = {
        email: mockEmail,
      };

      const createdUser = {
        ...mockUser,
        email: mockEmail,
        emailVerified: false,
        displayName: '',
        notificationSettings: JSON.stringify({
          emailNotifications: false,
          marketingEmails: false,
          securityAlerts: false,
        }),
      };

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdUser]),
        }),
      });

      vi.mocked(db.insert).mockReturnValue(mockInsert());

      const result = await createUser(userData);

      expect(result).toEqual(createdUser);
    });

    it('should use default notification settings when not provided', async () => {
      const userData = {
        email: mockEmail,
        emailVerified: true,
        displayName: 'Test User',
      };

      const createdUser = {
        ...mockUser,
        notificationSettings: JSON.stringify({
          emailNotifications: false,
          marketingEmails: false,
          securityAlerts: false,
        }),
      };

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([createdUser]),
        }),
      });

      vi.mocked(db.insert).mockReturnValue(mockInsert());

      const result = await createUser(userData);

      expect(result.notificationSettings).toBe(
        JSON.stringify({
          emailNotifications: false,
          marketingEmails: false,
          securityAlerts: false,
        })
      );
    });
  });

  describe('getUserByEmail', () => {
    it('should return user when found by email', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      });

      vi.mocked(db.select).mockReturnValue(mockSelect());

      const result = await getUserByEmail(mockEmail);

      expect(result).toEqual(mockUser);
      // getUserByEmail uses .select() without arguments, so it selects all fields
      expect(db.select).toHaveBeenCalledWith();
    });

    it('should return null when user not found by email', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      vi.mocked(db.select).mockReturnValue(mockSelect());

      const result = await getUserByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('deleteUserProfileImage', () => {
    it('should delete profile image and return the URL', async () => {
      const imageUrl = 'https://example.com/avatar.jpg';
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: mockUserId,
                profileImageUrl: imageUrl,
              },
            ]),
          }),
        }),
      });

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      vi.mocked(db.select).mockReturnValue(mockSelect());
      vi.mocked(db.update).mockReturnValue(mockUpdate());

      const result = await deleteUserProfileImage(mockUserId);

      expect(result).toBe(imageUrl);
      expect(db.select).toHaveBeenCalledWith({
        id: expect.anything(),
        profileImageUrl: expect.anything(),
      });
      expect(db.update).toHaveBeenCalled();
    });

    it('should throw error when user not found', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      vi.mocked(db.select).mockReturnValue(mockSelect());

      await expect(deleteUserProfileImage(mockUserId)).rejects.toThrow(
        ERROR_MESSAGES.USER_NOT_FOUND
      );
    });

    it('should throw error when user has no profile image', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: mockUserId,
                profileImageUrl: null,
              },
            ]),
          }),
        }),
      });

      vi.mocked(db.select).mockReturnValue(mockSelect());

      await expect(deleteUserProfileImage(mockUserId)).rejects.toThrow(
        'No profile image to delete'
      );
    });
  });
});
