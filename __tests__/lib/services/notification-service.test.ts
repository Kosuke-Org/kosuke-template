/**
 * Notification Service Tests
 * Tests for notification-related side effects (e.g., Resend audience sync)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { removeContactFromMarketingSegment, setAudienceForMarketingEmail } from '@/lib/email';
import {
  handleSignUpMarketingConsent,
  syncMarketingPreference,
} from '@/lib/services/notification-service';
import type { NotificationSettings } from '@/lib/types';

// Mock the email module
vi.mock('@/lib/email', () => ({
  setAudienceForMarketingEmail: vi.fn(),
  removeContactFromMarketingSegment: vi.fn(),
}));

describe('Notification Service', () => {
  const mockEmail = 'test@example.com';

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear console.log mocks
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('syncMarketingPreference', () => {
    it('should do nothing when marketing preference has not changed', async () => {
      const oldSettings: NotificationSettings = {
        emailNotifications: true,
        marketingEmails: true,
        securityAlerts: true,
      };

      const newSettings: NotificationSettings = {
        emailNotifications: false,
        marketingEmails: true, // Same as old
        securityAlerts: false,
      };

      await syncMarketingPreference(mockEmail, oldSettings, newSettings);

      expect(setAudienceForMarketingEmail).not.toHaveBeenCalled();
      expect(removeContactFromMarketingSegment).not.toHaveBeenCalled();
    });

    it('should add to marketing audience when user opts in', async () => {
      const oldSettings: NotificationSettings = {
        emailNotifications: true,
        marketingEmails: false,
        securityAlerts: true,
      };

      const newSettings: NotificationSettings = {
        emailNotifications: true,
        marketingEmails: true, // Changed from false to true
        securityAlerts: true,
      };

      await syncMarketingPreference(mockEmail, oldSettings, newSettings);

      expect(setAudienceForMarketingEmail).toHaveBeenCalledWith(mockEmail);
      expect(setAudienceForMarketingEmail).toHaveBeenCalledTimes(1);
      expect(removeContactFromMarketingSegment).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        'Marketing emails enabled, adding to Resend audience:',
        mockEmail
      );
    });

    it('should remove from marketing audience when user opts out', async () => {
      const oldSettings: NotificationSettings = {
        emailNotifications: true,
        marketingEmails: true,
        securityAlerts: true,
      };

      const newSettings: NotificationSettings = {
        emailNotifications: true,
        marketingEmails: false, // Changed from true to false
        securityAlerts: true,
      };

      await syncMarketingPreference(mockEmail, oldSettings, newSettings);

      expect(removeContactFromMarketingSegment).toHaveBeenCalledWith(mockEmail);
      expect(removeContactFromMarketingSegment).toHaveBeenCalledTimes(1);
      expect(setAudienceForMarketingEmail).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        'Marketing emails disabled, removing from Resend audience:',
        mockEmail
      );
    });

    it('should handle opt-in when both were initially false', async () => {
      const oldSettings: NotificationSettings = {
        emailNotifications: false,
        marketingEmails: false,
        securityAlerts: false,
      };

      const newSettings: NotificationSettings = {
        emailNotifications: false,
        marketingEmails: true,
        securityAlerts: false,
      };

      await syncMarketingPreference(mockEmail, oldSettings, newSettings);

      expect(setAudienceForMarketingEmail).toHaveBeenCalledWith(mockEmail);
      expect(removeContactFromMarketingSegment).not.toHaveBeenCalled();
    });

    it('should handle opt-out when both were initially true', async () => {
      const oldSettings: NotificationSettings = {
        emailNotifications: true,
        marketingEmails: true,
        securityAlerts: true,
      };

      const newSettings: NotificationSettings = {
        emailNotifications: true,
        marketingEmails: false,
        securityAlerts: true,
      };

      await syncMarketingPreference(mockEmail, oldSettings, newSettings);

      expect(removeContactFromMarketingSegment).toHaveBeenCalledWith(mockEmail);
      expect(setAudienceForMarketingEmail).not.toHaveBeenCalled();
    });

    it('should not be affected by changes to other notification settings', async () => {
      const oldSettings: NotificationSettings = {
        emailNotifications: true,
        marketingEmails: false,
        securityAlerts: true,
      };

      const newSettings: NotificationSettings = {
        emailNotifications: false, // Changed
        marketingEmails: false, // Unchanged
        securityAlerts: false, // Changed
      };

      await syncMarketingPreference(mockEmail, oldSettings, newSettings);

      expect(setAudienceForMarketingEmail).not.toHaveBeenCalled();
      expect(removeContactFromMarketingSegment).not.toHaveBeenCalled();
    });

    it('should propagate errors from setAudienceForMarketingEmail', async () => {
      const oldSettings: NotificationSettings = {
        emailNotifications: true,
        marketingEmails: false,
        securityAlerts: true,
      };

      const newSettings: NotificationSettings = {
        emailNotifications: true,
        marketingEmails: true,
        securityAlerts: true,
      };

      const mockError = new Error('Resend API error');
      vi.mocked(setAudienceForMarketingEmail).mockRejectedValue(mockError);

      await expect(syncMarketingPreference(mockEmail, oldSettings, newSettings)).rejects.toThrow(
        'Resend API error'
      );
    });

    it('should propagate errors from removeContactFromMarketingSegment', async () => {
      const oldSettings: NotificationSettings = {
        emailNotifications: true,
        marketingEmails: true,
        securityAlerts: true,
      };

      const newSettings: NotificationSettings = {
        emailNotifications: true,
        marketingEmails: false,
        securityAlerts: true,
      };

      const mockError = new Error('Resend API error');
      vi.mocked(removeContactFromMarketingSegment).mockRejectedValue(mockError);

      await expect(syncMarketingPreference(mockEmail, oldSettings, newSettings)).rejects.toThrow(
        'Resend API error'
      );
    });
  });

  describe('handleSignUpMarketingConsent', () => {
    it('should add to marketing audience when user consents during sign-up', async () => {
      await handleSignUpMarketingConsent(mockEmail, true);

      expect(setAudienceForMarketingEmail).toHaveBeenCalledWith(mockEmail);
      expect(setAudienceForMarketingEmail).toHaveBeenCalledTimes(1);
      expect(console.log).toHaveBeenCalledWith(
        'User opted into marketing during sign-up, adding to Resend audience:',
        mockEmail
      );
    });

    it('should not add to marketing audience when user does not consent', async () => {
      await handleSignUpMarketingConsent(mockEmail, false);

      expect(setAudienceForMarketingEmail).not.toHaveBeenCalled();
      expect(removeContactFromMarketingSegment).not.toHaveBeenCalled();
    });

    it('should handle multiple sign-ups with consent', async () => {
      const email1 = 'user1@example.com';
      const email2 = 'user2@example.com';

      await handleSignUpMarketingConsent(email1, true);
      await handleSignUpMarketingConsent(email2, true);

      expect(setAudienceForMarketingEmail).toHaveBeenCalledTimes(2);
      expect(setAudienceForMarketingEmail).toHaveBeenCalledWith(email1);
      expect(setAudienceForMarketingEmail).toHaveBeenCalledWith(email2);
    });

    it('should handle multiple sign-ups without consent', async () => {
      const email1 = 'user1@example.com';
      const email2 = 'user2@example.com';

      await handleSignUpMarketingConsent(email1, false);
      await handleSignUpMarketingConsent(email2, false);

      expect(setAudienceForMarketingEmail).not.toHaveBeenCalled();
    });

    it('should propagate errors from setAudienceForMarketingEmail', async () => {
      const mockError = new Error('Resend API error');
      vi.mocked(setAudienceForMarketingEmail).mockRejectedValue(mockError);

      await expect(handleSignUpMarketingConsent(mockEmail, true)).rejects.toThrow(
        'Resend API error'
      );
    });

    it('should handle empty email string with consent', async () => {
      await handleSignUpMarketingConsent('', true);

      expect(setAudienceForMarketingEmail).toHaveBeenCalledWith('');
      expect(setAudienceForMarketingEmail).toHaveBeenCalledTimes(1);
    });

    it('should handle special characters in email with consent', async () => {
      const specialEmail = 'user+test@example.com';

      await handleSignUpMarketingConsent(specialEmail, true);

      expect(setAudienceForMarketingEmail).toHaveBeenCalledWith(specialEmail);
      expect(setAudienceForMarketingEmail).toHaveBeenCalledTimes(1);
    });
  });
});
