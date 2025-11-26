import { NextRequest, NextResponse } from 'next/server';

import { getCookieCache } from 'better-auth/cookies';

import type { Session } from '@/lib/auth/providers';
import { COOKIE_SECURE, SIGN_IN_ATTEMPT_EMAIL_COOKIE } from '@/lib/auth/utils';

/**
 * Create a route matcher function
 * Supports exact matches and wildcard patterns with (.*)
 *
 * @example
 * const isPublic = createRouteMatcher(['/home', '/sign-in(.*)']);
 * isPublic('/sign-in/verify') // true
 */
function createRouteMatcher(routes: string[]) {
  return (request: NextRequest) => {
    const pathname = request.nextUrl.pathname;

    return routes.some((route) => {
      if (route === pathname) return true;

      if (route.includes('(.*)')) {
        const baseRoute = route.replace('(.*)', '');
        return pathname === baseRoute || pathname.startsWith(baseRoute + '/');
      }

      return false;
    });
  };
}

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
]);

const isOnboardingRoute = createRouteMatcher(['/onboarding']);
const isRootRoute = createRouteMatcher(['/']);
const isProtectedRoute = createRouteMatcher(['/org(.*)', '/settings(.*)']);
const isApiRoute = createRouteMatcher(['/api(.*)']);
const isSignInVerifyRoute = createRouteMatcher([
  '/sign-in/verify',
  '/sign-up/verify-email-address',
]);
const isAuthRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)']);

export async function middleware(req: NextRequest) {
  // API routes handle their own authentication via protectedProcedures
  if (isApiRoute(req)) return NextResponse.next();

  // Better Auth prefixes secure cookies with __Secure__ based on isSecure property or on NODE_ENV
  // We can't rely on NODE_ENV in the preview environment so we use the COOKIE_SECURE environment variable
  const sessionData = await getCookieCache<Session>(req, { isSecure: COOKIE_SECURE });
  const isAuthenticated = !!sessionData?.session;
  const activeOrganizationSlug = sessionData?.session?.activeOrganizationSlug ?? null;

  // Protect /sign-in/verify - requires active sign-in attempt cookie
  if (isSignInVerifyRoute(req)) {
    const attemptEmail = req.cookies.get(SIGN_IN_ATTEMPT_EMAIL_COOKIE)?.value;
    if (attemptEmail) return NextResponse.next();
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }

  // If user has an organization, redirect to dashboard
  if (isAuthenticated && activeOrganizationSlug) {
    if (isProtectedRoute(req)) return NextResponse.next();
    if (isPublicRoute(req) && !isRootRoute(req) && !isAuthRoute(req)) return NextResponse.next();
    return NextResponse.redirect(new URL(`/org/${activeOrganizationSlug}/dashboard`, req.url));
  }

  // Allow authenticated users to access onboarding
  if (isAuthenticated && isOnboardingRoute(req)) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users trying to access protected routes
  if (!isAuthenticated && !isPublicRoute(req)) {
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect', req.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Redirect authenticated users without organization to onboarding
  if (isAuthenticated && !activeOrganizationSlug) {
    // Prevent redirect loop - only redirect if not already on onboarding
    if (!isOnboardingRoute(req)) {
      return NextResponse.redirect(new URL('/onboarding', req.url));
    }
    return NextResponse.next();
  }

  // Allow all other requests for authenticated users
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
