import { RequestCookie } from 'next/dist/compiled/@edge-runtime/cookies';
import { NextRequest } from 'next/server';

import { middleware } from '@/middleware';
import { getCookieCache } from 'better-auth/cookies';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mockedSession } from './setup/mocks';

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

vi.mock('better-auth/cookies', () => {
  return { getCookieCache: vi.fn() };
});

const mockGetCookieCache = vi.mocked(getCookieCache);

describe('middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const makeReq = (url: string, cookies?: Record<string, string>) => {
    const req = new NextRequest(`http://localhost:3000${url}`);
    if (cookies) {
      vi.spyOn(req.cookies, 'get').mockImplementation((cookie: string | RequestCookie) => {
        if (typeof cookie === 'string') {
          return { name: cookie, value: cookies[cookie] };
        }
        return cookie;
      });
    }
    return req;
  };

  const mockSession = (sessionData: Awaited<ReturnType<typeof getCookieCache>> | null) => {
    mockGetCookieCache.mockResolvedValue(sessionData);
  };

  it('allows public routes for unauthenticated users', async () => {
    mockSession(null);

    const res = await middleware(makeReq('/terms'));
    expect(res).toEqual({ type: 'next' });
  });

  it('allows public routes (home, privacy, terms) for unauthenticated users', async () => {
    mockSession(null);

    const res = await middleware(makeReq('/home'));
    expect(res).toEqual({ type: 'next' });
  });

  it('redirects unauthenticated users on protected routes', async () => {
    mockSession(null);
    const res = await middleware(makeReq('/settings'));
    expect(res?.type).toBe('redirect');
    expect(res?.url).toContain('/sign-in');
    expect(res?.url).toContain('redirect=%2Fsettings');
  });

  it('redirects unauthenticated users on org routes', async () => {
    mockSession(null);

    const res = await middleware(makeReq('/org/test-org/dashboard'));
    expect(res?.type).toBe('redirect');
    expect(res?.url).toContain('/sign-in');
  });

  it('redirects authenticated users without activeOrganizationSlug to onboarding', async () => {
    mockSession(mockedSession);

    const res = await middleware(makeReq('/settings'));
    expect(res?.type).toBe('redirect');
    expect(res?.url).toContain('/onboarding');
  });

  it('allows authenticated users without activeOrganizationSlug to access onboarding', async () => {
    mockSession(mockedSession);

    const res = await middleware(makeReq('/onboarding'));
    expect(res).toEqual({ type: 'next' });
  });

  it('redirects authenticated users with activeOrganizationSlug from root to org dashboard', async () => {
    mockSession({
      ...mockedSession,
      session: {
        ...mockedSession.session,
        activeOrganizationId: 'org-1',
        activeOrganizationSlug: 'test-org',
      },
    });

    const res = await middleware(makeReq('/'));
    expect(res?.type).toBe('redirect');
    expect(res?.url).toContain('/org/test-org/dashboard');
  });

  it('allows authenticated users with activeOrganizationSlug to access protected routes', async () => {
    mockSession({
      ...mockedSession,
      session: {
        ...mockedSession.session,
        activeOrganizationId: 'org-1',
        activeOrganizationSlug: 'test-org',
      },
    });

    const res = await middleware(makeReq('/settings'));
    expect(res).toEqual({ type: 'next' });
  });

  it('allows authenticated users with activeOrganizationSlug to access org routes', async () => {
    mockSession({
      ...mockedSession,
      session: {
        ...mockedSession.session,
        activeOrganizationId: 'org-1',
        activeOrganizationSlug: 'test-org',
      },
    });

    const res = await middleware(makeReq('/org/test-org/dashboard'));
    expect(res).toEqual({ type: 'next' });
  });

  it('redirects authenticated users trying to access sign-in routes', async () => {
    mockSession({
      ...mockedSession,
      session: {
        ...mockedSession.session,
        activeOrganizationId: 'org-1',
        activeOrganizationSlug: 'test-org',
      },
    });

    const res = await middleware(makeReq('/sign-in'));
    expect(res?.type).toBe('redirect');
    expect(res?.url).toContain('/org/test-org/dashboard');
  });

  it('calls NextResponse.next() for API routes', async () => {
    mockSession(null);
    const res = await middleware(makeReq('/api/user'));
    expect(res).toEqual({ type: 'next' });
  });

  it('calls NextResponse.next() for tRPC routes', async () => {
    mockSession(null);
    const res = await middleware(makeReq('/api/trpc/user.list'));
    expect(res).toEqual({ type: 'next' });
  });

  it('allows authenticated users with activeOrganizationSlug to access public routes', async () => {
    mockSession({
      ...mockedSession,
      session: {
        ...mockedSession.session,
        activeOrganizationId: 'org-1',
        activeOrganizationSlug: 'test-org',
      },
    });

    const res = await middleware(makeReq('/privacy'));
    expect(res).toEqual({ type: 'next' });
  });

  it('redirects authenticated users without activeOrganizationSlug trying to access sign-in to onboarding', async () => {
    mockSession(mockedSession);

    const res = await middleware(makeReq('/sign-in'));
    expect(res?.type).toBe('redirect');
    expect(res?.url).toContain('/onboarding');
  });

  it('allows access to /sign-in/verify with valid sign_in_attempt_email cookie', async () => {
    mockSession(null);

    const res = await middleware(
      makeReq('/sign-in/verify', { sign_in_attempt_email: 'test@example.com' })
    );
    expect(res).toEqual({ type: 'next' });
  });

  it('redirects to /sign-in when accessing /sign-in/verify without sign_in_attempt_email cookie', async () => {
    mockSession(null);
    const res = await middleware(makeReq('/sign-in/verify'));
    expect(res?.type).toBe('redirect');
    expect(res?.url).toContain('/sign-in');
  });

  it('redirects authenticated users without activeOrganizationSlug from root to onboarding', async () => {
    mockSession(mockedSession);

    const res = await middleware(makeReq('/'));
    expect(res?.type).toBe('redirect');
    expect(res?.url).toContain('/onboarding');
  });
});
