/**
 * Better Auth Client with Email OTP
 * Client-side auth utilities
 * See: https://www.better-auth.com/docs/integrations/next
 */

import { createAuthClient } from 'better-auth/react';
import {
  emailOTPClient,
  inferAdditionalFields,
  inferOrgAdditionalFields,
  organizationClient,
} from 'better-auth/client/plugins';
import { customSessionClient } from 'better-auth/client/plugins';

import type { auth } from '@/lib/auth/providers';

/**
 * Better Auth client for use in React components with Email OTP support
 * Uses nano-store for state management and better-fetch for requests
 */
const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [
    emailOTPClient(),
    organizationClient({ schema: inferOrgAdditionalFields<typeof auth>() }),
    inferAdditionalFields<typeof auth>(),
    customSessionClient<typeof auth>(),
  ],
});

export const { useSession, signIn, signUp, signOut, emailOtp, organization } = authClient;

// export type Session = typeof auth.$Infer.Session;
// export type User = typeof auth.$Infer.Session.user;
// export type Organization = NonNullable<
//   Awaited<ReturnType<typeof organization.list>>['data']
// >[number];

export type FullOrganizationResponse = Awaited<ReturnType<typeof auth.api.getFullOrganization>>;
