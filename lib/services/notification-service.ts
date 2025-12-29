/**
 * Notification Service
 * Handles notification-related side effects (e.g., Resend audience sync)
 * This is where "signal-like" behavior lives
 */
import { removeContactFromMarketingSegment, setAudienceForMarketingEmail } from '@/lib/email';
import type { NotificationSettings } from '@/lib/types';

/**
 * Sync marketing email preferences with Resend Audience
 * This is called automatically when notification settings change
 * Similar to Django signals - triggers side effects based on data changes
 */
export async function syncMarketingPreference(
  email: string,
  oldSettings: NotificationSettings,
  newSettings: NotificationSettings
): Promise<void> {
  const wasEnabled = oldSettings.marketingEmails;
  const isEnabled = newSettings.marketingEmails;

  // No change, nothing to do
  if (wasEnabled === isEnabled) {
    return;
  }

  if (isEnabled && !wasEnabled) {
    // User opted in - add to marketing audience
    console.log('Marketing emails enabled, adding to Resend audience:', email);
    await setAudienceForMarketingEmail(email);
  } else if (!isEnabled && wasEnabled) {
    // User opted out - remove from marketing audience
    console.log('Marketing emails disabled, removing from Resend audience:', email);
    await removeContactFromMarketingSegment(email);
  }
}

/**
 * Handle user sign-up marketing consent
 * Called during user registration
 */
export async function handleSignUpMarketingConsent(
  email: string,
  marketingConsent: boolean
): Promise<void> {
  if (marketingConsent) {
    console.log('User opted into marketing during sign-up, adding to Resend audience:', email);
    await setAudienceForMarketingEmail(email);
  }
}
