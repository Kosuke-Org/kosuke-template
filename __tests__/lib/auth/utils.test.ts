import {
  isSyncStale,
  getUserInitials,
  extractUserData,
  extractUserDataFromWebhook,
  hasUserChanges,
  isValidEmail,
  getDisplayName,
  getUserEmail,
  createActivityLogData,
  isAuthenticated,
} from '@/lib/auth/utils';
import { ClerkUserType, ClerkWebhookUser, AuthState } from '@/lib/types';
import { ActivityType } from '@/lib/db/schema';
import { vi } from 'vitest';
import { createClerkWebhookUser } from '../../setup/factories';
import { EmailAddressJSON } from '@clerk/types';

// Mock external dependencies
vi.mock('@clerk/nextjs/server');
vi.mock('next/navigation');

const defaultEmailAddresses: EmailAddressJSON[] = [
  {
    id: 'email_123',
    object: 'email_address',
    email_address: 'test@example.com',
    verification: null,
    linked_to: [],
    matches_sso_connection: false,
  },
];

describe('Auth Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isSyncStale', () => {
    it('should return true for dates older than 24 hours', () => {
      const staleDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      expect(isSyncStale(staleDate)).toBe(true);
    });

    it('should return false for recent dates', () => {
      const recentDate = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago
      expect(isSyncStale(recentDate)).toBe(false);
    });

    it('should return false for dates exactly at 24 hours', () => {
      const exactDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Exactly 24 hours ago
      expect(isSyncStale(exactDate)).toBe(false);
    });

    it('should handle current time', () => {
      const now = new Date();
      expect(isSyncStale(now)).toBe(false);
    });

    it('should handle far past dates', () => {
      const farPast = new Date('2020-01-01');
      expect(isSyncStale(farPast)).toBe(true);
    });
  });

  describe('getUserInitials', () => {
    it('should return initials from full name', () => {
      const user = {
        fullName: 'John Doe',
        firstName: 'John',
      } as ClerkUserType;
      expect(getUserInitials(user)).toBe('JD');
    });

    it('should return initials from firstName when fullName is not available', () => {
      const user = {
        fullName: null,
        firstName: 'Alice',
      } as ClerkUserType;
      expect(getUserInitials(user)).toBe('A');
    });

    it('should return first letter of first name only', () => {
      const user = {
        fullName: 'SingleName',
        firstName: 'SingleName',
      } as ClerkUserType;
      expect(getUserInitials(user)).toBe('S');
    });

    it('should return "U" for null user', () => {
      expect(getUserInitials(null)).toBe('U');
    });

    it('should return "U" when both fullName and firstName are null', () => {
      const user = {
        fullName: null,
        firstName: null,
      } as ClerkUserType;
      expect(getUserInitials(user)).toBe('U');
    });

    it('should handle multiple names and return first two initials', () => {
      const user = {
        fullName: 'John Michael Doe Smith',
        firstName: 'John',
      } as ClerkUserType;
      expect(getUserInitials(user)).toBe('JM');
    });

    it('should handle empty string names', () => {
      const user = {
        fullName: '',
        firstName: '',
      } as ClerkUserType;
      expect(getUserInitials(user)).toBe('U');
    });
  });

  describe('extractUserData', () => {
    it('should extract user data from Clerk user object with custom profile image', () => {
      const clerkUser = {
        id: 'user_123',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
        fullName: 'John Doe',
        firstName: 'John',
        imageUrl: 'https://example.com/avatar.jpg',
        publicMetadata: {
          customProfileImageUrl: 'https://example.com/custom-avatar.jpg',
        },
      } as unknown as ClerkUserType;

      const result = extractUserData(clerkUser);

      expect(result).toEqual({
        clerkUserId: 'user_123',
        email: 'test@example.com',
        displayName: 'John Doe',
        profileImageUrl: 'https://example.com/custom-avatar.jpg',
        lastSyncedAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should extract user data from Clerk user object without custom profile image', () => {
      const clerkUser = {
        id: 'user_123',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
        fullName: 'John Doe',
        firstName: 'John',
        imageUrl: 'https://example.com/avatar.jpg',
      } as unknown as ClerkUserType;

      const result = extractUserData(clerkUser);

      expect(result).toEqual({
        clerkUserId: 'user_123',
        email: 'test@example.com',
        displayName: 'John Doe',
        profileImageUrl: null,
        lastSyncedAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should handle user with no full name', () => {
      const clerkUser = {
        id: 'user_123',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
        fullName: null,
        firstName: 'John',
        imageUrl: null,
      } as unknown as ClerkUserType;

      const result = extractUserData(clerkUser);

      expect(result.displayName).toBe('John');
      expect(result.profileImageUrl).toBe(null);
    });

    it('should handle user with no email addresses', () => {
      const clerkUser = {
        id: 'user_123',
        emailAddresses: [],
        fullName: 'John Doe',
        firstName: 'John',
        imageUrl: null,
      } as unknown as ClerkUserType;

      const result = extractUserData(clerkUser);

      expect(result.email).toBe('');
    });

    it('should handle user with null names', () => {
      const clerkUser = {
        id: 'user_123',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
        fullName: null,
        firstName: null,
        imageUrl: null,
      } as unknown as ClerkUserType;

      const result = extractUserData(clerkUser);

      expect(result.displayName).toBe(null);
    });
  });

  describe('extractUserDataFromWebhook', () => {
    it('should extract user data from webhook user object with custom profile image', () => {
      const webhookUser: ClerkWebhookUser = createClerkWebhookUser({
        id: 'user_123',
        first_name: 'John',
        last_name: 'Doe',
        image_url: 'https://example.com/avatar.jpg',
        email_addresses: defaultEmailAddresses,
        public_metadata: {
          customProfileImageUrl: 'https://example.com/custom-avatar.jpg',
        },
      });

      const result = extractUserDataFromWebhook(webhookUser);

      expect(result).toEqual({
        clerkUserId: 'user_123',
        email: 'test@example.com',
        displayName: 'John Doe',
        profileImageUrl: 'https://example.com/custom-avatar.jpg',
        lastSyncedAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should extract user data from webhook user object without custom profile image', () => {
      const webhookUser: ClerkWebhookUser = createClerkWebhookUser({
        id: 'user_123',
        first_name: 'John',
        last_name: 'Doe',
        image_url: 'https://example.com/avatar.jpg',
        email_addresses: defaultEmailAddresses,
      });

      const result = extractUserDataFromWebhook(webhookUser);

      expect(result).toEqual({
        clerkUserId: 'user_123',
        email: 'test@example.com',
        displayName: 'John Doe',
        profileImageUrl: null,
        lastSyncedAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should handle webhook user with only first name', () => {
      const webhookUser: ClerkWebhookUser = createClerkWebhookUser({
        id: 'user_123',
        first_name: 'John',
        last_name: null,
        image_url: '',
        email_addresses: defaultEmailAddresses,
      });

      const result = extractUserDataFromWebhook(webhookUser);

      expect(result.displayName).toBe('John');
    });

    it('should handle webhook user with no names', () => {
      const webhookUser: ClerkWebhookUser = createClerkWebhookUser({
        id: 'user_123',
        first_name: null,
        last_name: null,
        image_url: '',
        email_addresses: defaultEmailAddresses,
      });

      const result = extractUserDataFromWebhook(webhookUser);

      expect(result.displayName).toBe(null);
    });

    it('should handle webhook user with no email addresses', () => {
      const webhookUser: ClerkWebhookUser = createClerkWebhookUser({
        id: 'user_123',
        email_addresses: [],
        first_name: 'John',
        last_name: 'Doe',
        image_url: '',
      });

      const result = extractUserDataFromWebhook(webhookUser);

      expect(result.email).toBe('');
    });
  });

  describe('hasUserChanges', () => {
    const existingUser = {
      email: 'old@example.com',
      displayName: 'Old Name',
      profileImageUrl: 'https://old.com/avatar.jpg',
    };

    it('should return true when email changes', () => {
      const newUser = {
        ...existingUser,
        email: 'new@example.com',
      };

      expect(hasUserChanges(existingUser, newUser)).toBe(true);
    });

    it('should return true when display name changes', () => {
      const newUser = {
        ...existingUser,
        displayName: 'New Name',
      };

      expect(hasUserChanges(existingUser, newUser)).toBe(true);
    });

    it('should return true when profile image changes', () => {
      const newUser = {
        ...existingUser,
        profileImageUrl: 'https://new.com/avatar.jpg',
      };

      expect(hasUserChanges(existingUser, newUser)).toBe(true);
    });

    it('should return false when no changes', () => {
      const newUser = { ...existingUser };

      expect(hasUserChanges(existingUser, newUser)).toBe(false);
    });

    it('should handle null values', () => {
      const existingUserWithNulls = {
        email: 'test@example.com',
        displayName: null,
        profileImageUrl: null,
      };

      const newUserWithNulls = {
        email: 'test@example.com',
        displayName: null,
        profileImageUrl: null,
      };

      expect(hasUserChanges(existingUserWithNulls, newUserWithNulls)).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('should return true for valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'firstname.lastname@company.org',
        'user+tag@domain.com',
        'a@b.co',
      ];

      validEmails.forEach((email) => {
        expect(isValidEmail(email)).toBe(true);
      });
    });

    it('should return false for invalid email addresses', () => {
      const invalidEmails = [
        'invalid',
        '@domain.com',
        'user@',
        'user@domain',
        'user name@domain.com',
        'user@domain.',
        '',
        'user@@domain.com',
      ];

      invalidEmails.forEach((email) => {
        expect(isValidEmail(email)).toBe(false);
      });
    });
  });

  describe('getDisplayName', () => {
    it('should return full name for Clerk user', () => {
      const user = {
        fullName: 'John Doe',
        firstName: 'John',
      } as ClerkUserType;

      expect(getDisplayName(user)).toBe('John Doe');
    });

    it('should return first name when full name is not available', () => {
      const user = {
        fullName: null,
        firstName: 'John',
      } as ClerkUserType;

      expect(getDisplayName(user)).toBe('John');
    });

    it('should return "User" when no names available for Clerk user', () => {
      const user = {
        fullName: null,
        firstName: null,
      } as ClerkUserType;

      expect(getDisplayName(user)).toBe('User');
    });

    it('should return combined name for webhook user', () => {
      const user: ClerkWebhookUser = createClerkWebhookUser({
        id: 'user_123',
        first_name: 'John',
        last_name: 'Doe',
      });

      expect(getDisplayName(user)).toBe('John Doe');
    });

    it('should return first name only for webhook user', () => {
      const user: ClerkWebhookUser = createClerkWebhookUser({
        id: 'user_123',
        first_name: 'John',
        last_name: null,
      });

      expect(getDisplayName(user)).toBe('John');
    });

    it('should return "User" for webhook user with no names', () => {
      const user: ClerkWebhookUser = createClerkWebhookUser({
        id: 'user_123',
        first_name: null,
        last_name: null,
      });

      expect(getDisplayName(user)).toBe('User');
    });
  });

  describe('getUserEmail', () => {
    it('should return email from Clerk user', () => {
      const user = {
        emailAddresses: [{ emailAddress: 'test@example.com' }],
      } as ClerkUserType;

      expect(getUserEmail(user)).toBe('test@example.com');
    });

    it('should return empty string when no email addresses for Clerk user', () => {
      const user: ClerkWebhookUser = createClerkWebhookUser({
        id: 'user_123',
        email_addresses: [],
      });

      expect(getUserEmail(user)).toBe('');
    });

    it('should return email from webhook user', () => {
      const user: ClerkWebhookUser = createClerkWebhookUser({
        id: 'user_123',
        email_addresses: defaultEmailAddresses,
      });

      expect(getUserEmail(user)).toBe('test@example.com');
    });

    it('should return empty string when no email addresses for webhook user', () => {
      const user: ClerkWebhookUser = createClerkWebhookUser({
        id: 'user_123',
        email_addresses: [],
      });

      expect(getUserEmail(user)).toBe('');
    });
  });

  describe('createActivityLogData', () => {
    it('should create activity log data with all parameters', () => {
      const metadata = { action: 'test' };
      const result = createActivityLogData(
        'user_123',
        ActivityType.SIGN_IN,
        metadata,
        '192.168.1.1'
      );

      expect(result).toEqual({
        clerkUserId: 'user_123',
        action: ActivityType.SIGN_IN,
        metadata: JSON.stringify(metadata),
        ipAddress: '192.168.1.1',
        timestamp: expect.any(Date),
      });
    });

    it('should create activity log data with minimal parameters', () => {
      const result = createActivityLogData('user_123', ActivityType.SIGN_OUT);

      expect(result).toEqual({
        clerkUserId: 'user_123',
        action: ActivityType.SIGN_OUT,
        metadata: null,
        ipAddress: null,
        timestamp: expect.any(Date),
      });
    });
  });

  describe('isAuthenticated', () => {
    it('should return true for authenticated state', () => {
      const authState: AuthState = {
        isAuthenticated: true,
        user: { id: 'user_123' } as ClerkUserType,
        isLoading: false,
        localUser: {
          id: '1',
          clerkUserId: 'user_123',
          email: 'test@example.com',
          displayName: 'Test User',
          profileImageUrl: null,
          lastSyncedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      expect(isAuthenticated(authState)).toBe(true);
    });

    it('should return false when not authenticated', () => {
      const authState: AuthState = {
        isAuthenticated: false,
        user: null,
        localUser: null,
        isLoading: false,
      };

      expect(isAuthenticated(authState)).toBe(false);
    });

    it('should return false when user is null', () => {
      const authState: AuthState = {
        isAuthenticated: true,
        user: null,
        isLoading: false,
        localUser: {
          id: '1',
          clerkUserId: 'user_123',
          email: 'test@example.com',
          displayName: 'Test User',
          profileImageUrl: null,
          lastSyncedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      expect(isAuthenticated(authState)).toBe(false);
    });

    it('should return false when localUser is null', () => {
      const authState: AuthState = {
        isAuthenticated: true,
        user: { id: 'user_123' } as ClerkUserType,
        localUser: null,
        isLoading: false,
      };

      expect(isAuthenticated(authState)).toBe(false);
    });
  });
});
