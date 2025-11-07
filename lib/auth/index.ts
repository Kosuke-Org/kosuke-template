// Better Auth - Client and types
export { useSession, signIn, signUp, signOut, emailOtp } from './client';

// Better Auth Types - Re-exported from Better Auth Email OTP plugin
import type { EmailOTPOptions } from 'better-auth/plugins';

/**
 * OTP type from Better Auth Email OTP plugin
 */
export type OTPType = Parameters<EmailOTPOptions['sendVerificationOTP']>[0]['type'];

/**
 * Parameters for sending OTP emails
 * Matches Better Auth's sendVerificationOTP parameters
 */
export type SendOTPEmailParams = Parameters<EmailOTPOptions['sendVerificationOTP']>[0];

/**
 * Props for OTP email template component
 */
export type OTPEmailProps = {
  otp: string;
  type: OTPType;
};

export { ActivityType } from '@/lib/db/schema';

// Constants
export { AUTH_ROUTES } from './constants';
