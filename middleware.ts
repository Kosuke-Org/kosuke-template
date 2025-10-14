import { clerkMiddleware, ClerkMiddlewareAuth, createRouteMatcher } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

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
const isApiRoute = createRouteMatcher(['/api(.*)']);

export const baseMiddleware = async (auth: ClerkMiddlewareAuth, req: NextRequest) => {
  // API routes handle their own authentication via protectedProcedures
  if (isApiRoute(req)) return NextResponse.next();

  const { isAuthenticated, redirectToSignIn, sessionClaims, orgSlug } = await auth();
  const { url: reqUrl } = req;
  const isOnboardingComplete = sessionClaims?.publicMetadata?.onboardingComplete;

  // If user has an organization, redirect to dashboard (regardless of onboarding status)
  if (isAuthenticated && orgSlug) {
    if (reqUrl.includes(`/org`)) return NextResponse.next();
    if (isPublicRoute(req) && !isRootRoute(req)) return NextResponse.next();
    return NextResponse.redirect(new URL(`/org/${orgSlug}/dashboard`, reqUrl));
  }

  if (isAuthenticated && isOnboardingRoute(req)) {
    return NextResponse.next();
  }

  if (!isAuthenticated && !isPublicRoute(req)) return redirectToSignIn({ returnBackUrl: reqUrl });

  if (isAuthenticated && !isOnboardingComplete) {
    // Prevent redirect loop - only redirect if not already on onboarding
    if (!isOnboardingRoute(req)) return NextResponse.redirect(new URL('/onboarding', reqUrl));
    return NextResponse.next();
  }

  // Allow all other requests for authenticated users
  return NextResponse.next();
};

export default clerkMiddleware(baseMiddleware);

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
