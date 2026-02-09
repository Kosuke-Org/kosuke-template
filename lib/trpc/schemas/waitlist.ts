/**
 * Waitlist Zod Schemas
 * Client-safe validation schemas (no server dependencies)
 */
import { z } from 'zod';

export const joinWaitlistSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  referrer: z.string().optional(),
});
