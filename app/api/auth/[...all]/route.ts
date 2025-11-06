/**
 * Better Auth API Route
 * Handles all Better Auth endpoints
 */

import { auth } from '@/lib/auth/providers';
import { toNextJsHandler } from 'better-auth/next-js';

export const { GET, POST } = toNextJsHandler(auth.handler);
