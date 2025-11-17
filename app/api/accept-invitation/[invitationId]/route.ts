import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth/providers';
import { getOrgById } from '@/lib/organizations';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  const { invitationId } = await params;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      // Not signed in, redirect to sign-in and preserve this API URL as redirect target
      const signInUrl = new URL('/sign-in', baseUrl);
      signInUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(signInUrl);
    }

    const data = await auth.api.acceptInvitation({
      body: {
        invitationId,
      },
      headers: await headers(),
    });

    // set active organization if it exists
    if (data?.invitation?.organizationId) {
      const { organizationId } = data.invitation;

      const org = await getOrgById(organizationId);
      await auth.api.setActiveOrganization({
        body: {
          organizationId,
          organizationSlug: org?.slug,
        },
        headers: await headers(),
      });
    }

    // Redirect to root – middleware will route to active org dashboard if available
    return NextResponse.redirect(new URL('/', baseUrl));
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(new URL('/', baseUrl));
  }
}
