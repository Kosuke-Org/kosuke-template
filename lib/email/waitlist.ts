/**
 * Waitlist Email Sender
 * Sends confirmation email to waitlist subscribers
 */
import { WaitlistConfirmationEmail } from '@/emails/waitlist-confirmation';

import { sendEmail } from './index';

/**
 * Send waitlist confirmation email
 */
export async function sendWaitlistConfirmationEmail(email: string): Promise<void> {
  try {
    await sendEmail({
      to: email,
      subject: 'Welcome to the Waitlist!',
      react: WaitlistConfirmationEmail({ email }),
    });

    console.log(`Waitlist confirmation email sent to ${email}`);
  } catch (error) {
    console.error(`Failed to send waitlist confirmation email to ${email}:`, error);
    throw error;
  }
}
