import React from 'react';

import { render } from '@react-email/components';
import { Resend, Segment } from 'resend';

import { addToMarketingSegmentJob, removeFromMarketingSegmentJob } from '@/lib/queue';

// Only initialize Resend client if the API key is set
let resend: Resend | null = null;

if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

// Email configuration
const EMAIL_CONFIG = {
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

    if (!resend) {
      console.log('MOCK EMAIL:', text);
      return;
    }

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

// Helper to add delay between API calls to respect Resend's 2 req/sec rate limit
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const RATE_LIMIT_DELAY = 600; // 600ms = ~1.67 req/sec (safe buffer for 2 req/sec limit)

/**
 * Create a Resend contact immediately
 * This is typically called as part of user registration flow
 */
export const createResendContact = async (email: string) => {
  if (!resend) {
    return null;
  }

  try {
    const result = await resend.contacts.create({
      email,
    });

    if (result.error) {
      console.error('Error creating Resend contact:', result.error);
      return null;
    }

    console.log('Resend contact created:', result.data?.id);
    return result.data;
  } catch (error) {
    console.error('Error creating Resend contact:', error);
    return null;
  }
};

const MARKETING_SEGMENT_NAME = 'Marketing';

/**
 * Get or create marketing segment
 * Used internally by queue jobs
 */
export const getOrCreateMarketingSegment = async () => {
  if (!resend) {
    return null;
  }

  try {
    let segment: Segment | null = null;

    await sleep(RATE_LIMIT_DELAY);
    const segmentsResponse = await resend.segments.list();

    if (segmentsResponse.error) {
      console.error('Error listing segments:', segmentsResponse.error);
      return null;
    }

    if (segmentsResponse.data?.data) {
      segment = segmentsResponse.data.data.find((s) => s.name === MARKETING_SEGMENT_NAME) ?? null;
    }

    if (!segment) {
      console.log('Creating Marketing segment...');
      await sleep(RATE_LIMIT_DELAY);
      const createSegmentResponse = await resend.segments.create({
        name: MARKETING_SEGMENT_NAME,
      });

      if (createSegmentResponse.error) {
        console.error('Error creating segment:', createSegmentResponse.error);
        return null;
      }

      // Cast to Segment as create method returns
      // interface CreateSegmentResponseSuccess extends Pick<Segment, 'name' | 'id'> {
      //  object: 'segment';
      // }
      if (createSegmentResponse.data) {
        segment = createSegmentResponse.data as unknown as Segment;
      }
    }

    return segment;
  } catch (error) {
    console.error('Error getting or creating marketing segment:', error);
    return null;
  }
};

/**
 * Add contact to marketing segment (direct call, used by queue jobs)
 * - Creates contact if it doesn't exist
 * - Creates "Marketing" segment if it doesn't exist
 * - Adds contact to the Marketing segment
 */
export async function addContactToMarketingSegment(email: string) {
  if (!resend) {
    return;
  }

  const segment = await getOrCreateMarketingSegment();

  if (!segment) {
    throw new Error('Failed to get or create marketing segment');
  }

  let contactId: string | null = null;

  // Check if contact exists
  await sleep(RATE_LIMIT_DELAY);
  const contactResponse = await resend.contacts.get({ email });

  if (contactResponse.error) {
    // 404 is expected when contact doesn't exist yet
    if (contactResponse.error.name !== 'not_found') {
      console.error(`Error getting contact for email ${email}:`, contactResponse.error);
    }
  } else if (contactResponse.data) {
    contactId = contactResponse.data.id;
    console.log('Found existing contact:', contactId);
  }

  // Create contact if it doesn't exist
  if (!contactId) {
    console.log('Creating contact for:', email, new Date().getTime());
    await sleep(RATE_LIMIT_DELAY);
    const createContactResponse = await resend.contacts.create({
      email,
    });

    if (createContactResponse.error) {
      console.error('Error creating contact:', createContactResponse.error);
      throw new Error(`Failed to create contact: ${createContactResponse.error.message}`);
    }

    contactId = createContactResponse.data?.id ?? null;
    console.log('Contact created:', contactId);
  }

  if (!contactId) {
    throw new Error('Failed to get or create contact');
  }

  // Add contact to segment
  console.log('Adding contact to Marketing segment...');
  await sleep(RATE_LIMIT_DELAY);
  const addToSegmentResponse = await resend.contacts.segments.add({
    contactId,
    segmentId: segment.id,
  });

  if (addToSegmentResponse.error) {
    console.error('Error adding contact to segment:', addToSegmentResponse.error);
    throw new Error(`Failed to add contact to segment: ${addToSegmentResponse.error.message}`);
  }

  console.log('Contact added to Marketing segment');
}

/**
 * Queue: Add contact to marketing audience via BullMQ
 * This operation is queued because it's not time-sensitive and involves multiple API calls.
 */
export async function setAudienceForMarketingEmail(email: string) {
  if (!resend) {
    return;
  }

  try {
    const job = await addToMarketingSegmentJob({ email });
    console.log('Add to marketing segment queued:', job.id);
    return { jobId: job.id };
  } catch (error) {
    console.error('Error queueing add to marketing segment:', error);
    return;
  }
}

/**
 * Remove contact from marketing segment (direct call, used by queue jobs)
 * Used when users opt out of marketing emails
 */
export async function removeContactFromMarketingSegmentDirect(email: string) {
  if (!resend) {
    return;
  }

  await sleep(RATE_LIMIT_DELAY);
  const segmentsResponse = await resend.segments.list();

  if (segmentsResponse.error) {
    console.error('Error listing segments:', segmentsResponse.error);
    throw new Error(`Failed to list segments: ${segmentsResponse.error.message}`);
  }

  const segment = segmentsResponse.data?.data?.find((s) => s.name === MARKETING_SEGMENT_NAME);

  if (!segment?.id) {
    console.log('Marketing segment not found, nothing to remove');
    return;
  }

  console.log(`Removing contact email ${email} from Marketing segment...`);
  await sleep(RATE_LIMIT_DELAY);
  const removeResponse = await resend.contacts.segments.remove({
    email,
    segmentId: segment.id,
  });

  if (removeResponse.error) {
    // If contact doesn't exist (404), that's fine - nothing to remove
    if (removeResponse.error.name === 'not_found') {
      console.log(`Contact email ${email} not found, nothing to remove`);
      return;
    }

    // For other errors, throw so the job can be retried
    console.error(`Error removing contact email ${email} from segment:`, removeResponse.error);
    throw new Error(`Failed to remove contact from segment: ${removeResponse.error.message}`);
  }

  console.log(`Contact email ${email} removed from Marketing segment`);
}

/**
 * Queue: Remove contact from marketing segment via BullMQ
 * This operation is queued because it's not time-sensitive.
 */
export async function removeContactFromMarketingSegment(email: string) {
  if (!resend) {
    return;
  }

  try {
    const job = await removeFromMarketingSegmentJob({ email });
    console.log('Remove from marketing segment queued:', job.id);
    return { jobId: job.id };
  } catch (error) {
    console.error('Error queueing remove from marketing segment:', error);
    return;
  }
}
