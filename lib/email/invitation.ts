import { type InvitationEmailParams } from '../auth';
import { sendEmail } from './index';
import InvitationEmail from '@/emails/invitation';

/**
 * Send OTP email using Resend
 * Integrates Better Auth Email OTP with existing Resend infrastructure
 */
export async function sendInvitationEmail(data: InvitationEmailParams) {
  try {
    console.log(`📧 Sending organization invitation to:`, data.email);

    await sendEmail({
      to: data.email,
      subject: 'You have been invited to join an organization',
      react: InvitationEmail(data),
    });

    console.log(`✅ Organization invitation sent successfully to:`, data.email);
  } catch (error) {
    console.error(`💥 Error sending organization invitation to ${data.email}:`, error);
    throw error;
  }
}
