// Better Auth Types - Re-exported from Better Auth Email OTP plugin
import type { EmailOTPOptions, OrganizationOptions } from 'better-auth/plugins';

// Better Auth - Client and types
export { authClient, signIn, signOut, emailOtp } from './client';

/**
 * OTP type from Better Auth Email OTP plugin
 */
export type OTPType = Parameters<EmailOTPOptions['sendVerificationOTP']>[0]['type'];

/**
 * Parameters for sending OTP emails
 * Matches Better Auth's sendVerificationOTP parameters
 */
export type SendOTPEmailParams = Parameters<EmailOTPOptions['sendVerificationOTP']>[0];

export type InvitationEmailParams = Parameters<
  NonNullable<OrganizationOptions['sendInvitationEmail']>
>[0] & {
  inviteLink: string;
};

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

export type CookieSameSiteType = 'lax' | 'strict' | 'none';
