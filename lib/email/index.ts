import { Resend } from 'resend';
import { render } from '@react-email/components';
import React from 'react';

// Initialize Resend client
export const resend = new Resend(process.env.RESEND_API_KEY);

// Email configuration
export const EMAIL_CONFIG = {
  FROM_EMAIL: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
  FROM_NAME: process.env.RESEND_FROM_NAME || 'Kosuke Template',
  REPLY_TO: process.env.RESEND_REPLY_TO,
} as const;

// Email sending function with React Email support
export async function sendEmail({
  to,
  subject,
  react,
  from = `${EMAIL_CONFIG.FROM_NAME} <${EMAIL_CONFIG.FROM_EMAIL}>`,
  replyTo = EMAIL_CONFIG.REPLY_TO,
}: {
  to: string | string[];
  subject: string;
  react: React.ReactElement;
  from?: string;
  replyTo?: string;
}) {
  try {
    console.log('📧 Sending email to:', typeof to === 'string' ? to : to.join(', '));

    // Render React component to HTML and text
    const html = await render(react);
    const text = await render(react, { plainText: true });

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

// Utility function to render React Email component to HTML for preview
export async function renderEmailToHtml(component: React.ReactElement): Promise<string> {
  return await render(component);
}

// Utility function to render React Email component to plain text
export async function renderEmailToText(component: React.ReactElement): Promise<string> {
  return await render(component, { plainText: true });
}
