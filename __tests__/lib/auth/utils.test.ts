import {
  isSyncStale,
  getUserInitials,
  extractUserData,
  extractUserDataFromWebhook,
} from '@/lib/auth/utils';

describe('Auth Utils - Business Logic', () => {
  describe('isSyncStale', () => {
    it('should identify when user sync is needed', () => {
      const staleDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      const recentDate = new Date(Date.now() - 23 * 60 * 60 * 1000); // 23 hours ago

      expect(isSyncStale(staleDate)).toBe(true);
      expect(isSyncStale(recentDate)).toBe(false);
    });
  });

  describe('getUserInitials', () => {
    it('should generate proper initials for UI avatars', () => {
      // Test the actual business logic for user avatars
      expect(getUserInitials({ fullName: 'John Doe' } as any)).toBe('JD');
      expect(getUserInitials({ firstName: 'John', fullName: null } as any)).toBe('J');
      expect(getUserInitials(null)).toBe('U');
      expect(getUserInitials({ fullName: 'john doe' } as any)).toBe('JD'); // uppercase
      expect(getUserInitials({ fullName: 'John Michael Alexander Smith' } as any)).toBe('JM'); // max 2 chars
    });
  });

  describe('extractUserData', () => {
    it('should transform Clerk user for database storage', () => {
      const clerkUser = {
        id: 'user_123',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
        fullName: 'John Doe',
        imageUrl: 'https://example.com/avatar.jpg',
      } as any;

      const result = extractUserData(clerkUser);

      expect(result.clerkUserId).toBe('user_123');
      expect(result.email).toBe('test@example.com');
      expect(result.displayName).toBe('John Doe');
      expect(result.profileImageUrl).toBe('https://example.com/avatar.jpg');
      expect(result.lastSyncedAt).toBeInstanceOf(Date);
    });

    it('should handle missing data gracefully', () => {
      expect(extractUserData({ emailAddresses: [], id: 'user_123' } as any).email).toBe('');
      expect(
        extractUserData({
          emailAddresses: [{}],
          fullName: null,
          firstName: 'John',
          id: 'user_123',
        } as any).displayName
      ).toBe('John');
    });
  });

  describe('extractUserDataFromWebhook', () => {
    it('should transform webhook data for storage', () => {
      const webhookUser = {
        id: 'user_123',
        email_addresses: [{ email_address: 'test@example.com' }],
        first_name: 'Jane',
        last_name: 'Smith',
      };

      const result = extractUserDataFromWebhook(webhookUser);

      expect(result.clerkUserId).toBe('user_123');
      expect(result.email).toBe('test@example.com');
      expect(result.displayName).toBe('Jane Smith');
    });
  });
});
