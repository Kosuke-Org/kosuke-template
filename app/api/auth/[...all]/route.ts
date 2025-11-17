/**
 * Better Auth API Route
 * Handles all Better Auth endpoints
 */
import { toNextJsHandler } from 'better-auth/next-js';

import { auth } from '@/lib/auth/providers';

export const { GET, POST } = toNextJsHandler(auth.handler);
