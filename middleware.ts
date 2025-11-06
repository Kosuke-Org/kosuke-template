import { NextRequest, NextResponse } from 'next/server';
import { getCookieCache } from 'better-auth/cookies';
import type { Session } from '@/lib/auth/providers';

/**
 * Create a route matcher function (similar to Clerk's createRouteMatcher)
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
const isSignInVerifyRoute = createRouteMatcher(['/sign-in/verify']);
const isAuthRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)']);

export async function middleware(req: NextRequest) {
  // API routes handle their own authentication via protectedProcedures
  if (isApiRoute(req)) return NextResponse.next();

  const sessionData = await getCookieCache<Session>(req);
  const orgSlug = sessionData?.session?.orgSlug ?? null;

  // If authenticated user tries to access auth routes (sign-in, sign-up)
  if (sessionData && isAuthRoute(req)) {
    // If has orgSlug, redirect to org dashboard
    if (orgSlug) {
      return NextResponse.redirect(new URL(`/org/${orgSlug}/dashboard`, req.url));
    }
    // If no orgSlug, redirect to onboarding
    return NextResponse.redirect(new URL('/onboarding', req.url));
  }

  // Protect /sign-in/verify - requires active sign-in attempt cookie
  if (isSignInVerifyRoute(req)) {
    const attemptEmail = req.cookies.get('sign_in_attempt_email')?.value;
    if (attemptEmail) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }

  // If no session and trying to access protected route, redirect to sign-in
  if (!sessionData && !isPublicRoute(req)) {
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect', req.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  // If has session but no orgSlug
  if (sessionData && !orgSlug) {
    // Allow onboarding route (user needs to complete onboarding)
    if (isOnboardingRoute(req)) {
      return NextResponse.next();
    }

    // Allow non-auth public routes (except root and auth routes)
    if (isPublicRoute(req) && !isRootRoute(req) && !isAuthRoute(req)) {
      return NextResponse.next();
    }

    // Redirect to onboarding for all other routes (including protected routes and root)
    return NextResponse.redirect(new URL('/onboarding', req.url));
  }

  // If has session AND orgSlug
  if (sessionData && orgSlug) {
    // Allow access to protected routes
    if (isProtectedRoute(req)) {
      return NextResponse.next();
    }

    // Allow non-auth public routes (except root and auth routes)
    if (isPublicRoute(req) && !isRootRoute(req) && !isAuthRoute(req)) {
      return NextResponse.next();
    }

    // Redirect from root to org dashboard
    if (isRootRoute(req)) {
      return NextResponse.redirect(new URL(`/org/${orgSlug}/dashboard`, req.url));
    }
  }

  // Allow all public routes for unauthenticated users
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
