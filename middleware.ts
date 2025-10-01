import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
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
  '/api/billing/webhook',
  '/api/clerk/webhook',
  '/api/webhooks(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  // Get the current path
  const { pathname } = req.nextUrl;

  // Allow public routes
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // For protected routes, check if user is authenticated
  const { userId } = await auth();

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
