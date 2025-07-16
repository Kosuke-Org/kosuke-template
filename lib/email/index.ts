import { Resend } from 'resend';

// Initialize Resend client
export const resend = new Resend(process.env.RESEND_API_KEY);

// Email configuration
export const EMAIL_CONFIG = {
  FROM_EMAIL: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
  FROM_NAME: process.env.RESEND_FROM_NAME || 'Kosuke Template',
  REPLY_TO: process.env.RESEND_REPLY_TO,
} as const;

// Email template types
export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

// Email sending function with error handling
export async function sendEmail({
  to,
  subject,
  html,
  text,
  from = `${EMAIL_CONFIG.FROM_NAME} <${EMAIL_CONFIG.FROM_EMAIL}>`,
  replyTo = EMAIL_CONFIG.REPLY_TO,
}: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  from?: string;
  replyTo?: string;
}) {
  try {
    console.log('📧 Sending email to:', typeof to === 'string' ? to : to.join(', '));

    const result = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text,
      ...(replyTo && { replyTo }),
    });

    if (result.error) {
      console.error('💥 Resend error:', result.error);
      throw new Error(`Email sending failed: ${result.error.message}`);
    }

    console.log('✅ Email sent successfully:', result.data?.id);
    return result.data;
  } catch (error) {
    console.error('💥 Error sending email:', error);
    throw error;
  }
}

// Utility function to validate email address
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
