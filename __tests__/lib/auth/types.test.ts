import type { LocalUser, ClerkWebhookUser, ClerkWebhookEvent } from '@/lib/auth/types';

describe('Auth Types', () => {
  describe('LocalUser', () => {
    it('should validate local user structure', () => {
      const validUser: LocalUser = {
        id: 1,
        clerkUserId: 'user_123',
        email: 'test@example.com',
        displayName: 'John Doe',
        profileImageUrl: 'https://example.com/avatar.jpg',
        lastSyncedAt: new Date('2023-01-01'),
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
      };

      expect(validUser.id).toBe(1);
      expect(validUser.clerkUserId).toBe('user_123');
      expect(validUser.email).toBe('test@example.com');
      expect(validUser.displayName).toBe('John Doe');
      expect(validUser.profileImageUrl).toBe('https://example.com/avatar.jpg');
    });

    it('should allow null values for optional fields', () => {
      const minimalUser: LocalUser = {
        id: 1,
        clerkUserId: 'user_123',
        email: 'test@example.com',
        displayName: null,
        profileImageUrl: null,
        lastSyncedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(minimalUser.displayName).toBeNull();
      expect(minimalUser.profileImageUrl).toBeNull();
    });
  });

  describe('ClerkWebhookUser', () => {
    it('should represent webhook user data', () => {
      const webhookUser: ClerkWebhookUser = {
        id: 'user_123',
        email_addresses: [{ email_address: 'test@example.com' }],
        first_name: 'John',
        last_name: 'Doe',
        image_url: 'https://example.com/avatar.jpg',
      };

      expect(webhookUser.id).toBe('user_123');
      expect(webhookUser.email_addresses).toBeDefined();
      expect(webhookUser.first_name).toBe('John');
      expect(webhookUser.last_name).toBe('Doe');
    });

    it('should handle minimal webhook data', () => {
      const minimalWebhookUser: ClerkWebhookUser = {
        id: 'user_123',
      };

      expect(minimalWebhookUser.id).toBe('user_123');
      expect(minimalWebhookUser.email_addresses).toBeUndefined();
    });
  });

  describe('ClerkWebhookEvent', () => {
    it('should represent webhook events', () => {
      const createEvent: ClerkWebhookEvent = {
        type: 'user.created',
        data: {
          id: 'user_123',
          email_addresses: [{ email_address: 'test@example.com' }],
        },
      };

      expect(createEvent.type).toBe('user.created');
      expect(createEvent.data.id).toBe('user_123');
    });

    it('should support all event types', () => {
      const eventTypes: ClerkWebhookEvent['type'][] = [
        'user.created',
        'user.updated',
        'user.deleted',
      ];

      eventTypes.forEach((type) => {
        const event: ClerkWebhookEvent = {
          type,
          data: { id: 'user_123' },
        };
        expect(event.type).toBe(type);
      });
    });
  });
});
