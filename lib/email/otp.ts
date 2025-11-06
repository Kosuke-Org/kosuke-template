import { sendEmail } from './index';
import OTPEmail from '@/emails/otp';
import type { OTPType, SendOTPEmailParams } from '@/lib/auth';

const OTPTypeSubjects: Record<OTPType, string> = {
  'sign-in': 'Your sign-in code',
  'email-verification': 'Verify your email address',
  'forget-password': 'Reset your password',
};

/**
 * Send OTP email using Resend
 * Integrates Better Auth Email OTP with existing Resend infrastructure
 */
export async function sendOTPEmail({ email, otp, type }: SendOTPEmailParams) {
  try {
    console.log(`📧 Sending ${type} OTP to:`, email);

    const subject = OTPTypeSubjects[type];

    await sendEmail({
      to: email,
      subject,
      react: OTPEmail({ otp, type }),
    });

    console.log(`✅ ${type} OTP sent successfully to:`, email);
  } catch (error) {
    console.error(`💥 Error sending ${type} OTP to ${email}:`, error);
    throw error;
  }
}
