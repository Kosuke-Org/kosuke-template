import { clerkMiddleware, createRouteMatcher, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { AUTH_ROUTES, createSafeRedirectUrl } from '@/lib/auth';

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/home',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/privacy',
  '/terms',
  // SEO and metadata routes
  '/robots.txt',
  '/sitemap.xml',
  '/favicon.ico',
  '/favicon.svg',
  '/favicon-96x96.png',
  '/apple-touch-icon.png',
  '/opengraph-image.png',
  // API routes
  '/api/billing/webhook',
  '/api/clerk/webhook',
  '/api/webhooks(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  // Get the current path
  const { pathname } = req.nextUrl;
  const { userId } = await auth();

  // Smart redirect for root route: logged-in users go to their org dashboard
  if (pathname === '/' && userId) {
    try {
      const clerk = await clerkClient();

      // Get user's organization memberships from Clerk
      const { data: memberships } = await clerk.users.getOrganizationMembershipList({ userId });

      // No organizations, go to onboarding to create first org
      if (memberships.length === 0) {
        return NextResponse.redirect(new URL('/onboarding', req.url));
      }

      // Get the first organization's slug
      const org = await clerk.organizations.getOrganization({
        organizationId: memberships[0].organization.id,
      });

      return NextResponse.redirect(new URL(`/org/${org.slug}/dashboard`, req.url));
    } catch (error) {
      console.error('Error in middleware org lookup:', error);
      // Fallback to onboarding on error
      return NextResponse.redirect(new URL('/onboarding', req.url));
    }
  }

  // Allow public routes
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // For protected routes, check if user is authenticated
  if (!userId) {
    // Redirect to sign-in for unauthenticated users
    const signInUrl = createSafeRedirectUrl(
      new URL(AUTH_ROUTES.SIGN_IN, req.url).toString(),
      pathname
    );
    return NextResponse.redirect(new URL(signInUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
