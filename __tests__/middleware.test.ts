import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { baseMiddleware as middleware } from '../middleware';
import { ClerkMiddlewareAuth } from '@clerk/nextjs/server';

vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server');
  return {
    ...actual,
    NextResponse: {
      next: vi.fn(() => ({ type: 'next' })),
      redirect: vi.fn((url: URL) => ({ type: 'redirect', url: url.toString() })),
    },
  };
});

vi.mock('@clerk/nextjs/server', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  clerkMiddleware: (fn: any) => fn,
  createRouteMatcher: (routes: string[]) => {
    return (req: NextRequest) => {
      const url = new URL(req.url);
      return routes.some((route) => {
        // Handle exact matches and wildcard patterns
        if (route === url.pathname) return true;
        if (route.includes('(.*)')) {
          const baseRoute = route.replace('(.*)', '');
          return url.pathname.startsWith(baseRoute);
        }
        return false;
      });
    };
  },
}));

describe('middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const makeReq = (url: string) => new NextRequest(`http://localhost:3000${url}`);

  it('allows public routes for unauthenticated users', async () => {
    const mockAuth = vi
      .fn()
      .mockResolvedValue({ isAuthenticated: false }) as unknown as ClerkMiddlewareAuth;
    const res = await middleware(mockAuth, makeReq('/terms'));
    expect(res).toEqual({ type: 'next' });
  });

  it('redirects unauthenticated users on protected routes', async () => {
    const redirectToSignIn = vi.fn(({ returnBackUrl }) => ({
      type: 'redirect',
      url: `${returnBackUrl}/sign-in`,
    }));

    const mockAuth = vi.fn().mockResolvedValue({
      isAuthenticated: false,
      redirectToSignIn,
    }) as unknown as ClerkMiddlewareAuth;

    const res = await middleware(mockAuth, makeReq('/dashboard'));
    expect(redirectToSignIn).toHaveBeenCalled();
    expect(res?.type).toBe('redirect');
    expect(res?.url).toContain('/sign-in');
  });

  it('redirects authenticated users without onboarding', async () => {
    const mockAuth = vi.fn().mockResolvedValue({
      isAuthenticated: true,
      sessionClaims: { publicMetadata: { onboardingComplete: false } },
    }) as unknown as ClerkMiddlewareAuth;

    const res = await middleware(mockAuth, makeReq('/dashboard'));
    expect(res?.type).toBe('redirect');
    expect(res?.url).toContain('/onboarding');
  });

  it('redirects authenticated users with onboarding to org dashboard', async () => {
    const mockAuth = vi.fn().mockResolvedValue({
      isAuthenticated: true,
      sessionClaims: { publicMetadata: { onboardingComplete: true } },
      orgSlug: 'test-org',
    }) as unknown as ClerkMiddlewareAuth;

    const res = await middleware(mockAuth, makeReq('/'));
    expect(res?.type).toBe('redirect');
    expect(res?.url).toContain('/org/test-org/dashboard');
  });

  it('calls NextResponse.next() for API routes', async () => {
    const mockAuth = vi.fn().mockResolvedValue({}) as unknown as ClerkMiddlewareAuth;
    const res = await middleware(mockAuth, makeReq('/api/user'));
    expect(res).toEqual({ type: 'next' });
  });
});
