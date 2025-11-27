import { NextRequest } from 'next/server';

import { middleware } from '@/middleware';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Session } from '@/lib/auth/providers';
import { SIGN_IN_ATTEMPT_EMAIL_COOKIE } from '@/lib/auth/utils';

import { mockedSession } from './setup/mocks';

type RequestCookie = {
  name: string;
  value: string;
};

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

/**
 * Encode session data to base64 (same format Better Auth uses)
 */
function encodeSessionCookie(sessionData: Session): string {
  return Buffer.from(JSON.stringify({ session: sessionData })).toString('base64');
}

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

  /**
   * Mock session by setting the better-auth.session_data cookie
   * Pass null to simulate no session
   */

  const mockSession = (sessionData: Session | null) => {
    const cookies: Record<string, string> = {};
    if (sessionData) {
      cookies['better-auth.session_data'] = encodeSessionCookie(sessionData);
    }
    return cookies;
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
    const cookies = mockSession(mockedSession);

    const res = await middleware(makeReq('/settings', cookies));
    expect(res?.type).toBe('redirect');
    expect(res?.url).toContain('/onboarding');
  });

  it('allows authenticated users without activeOrganizationSlug to access onboarding', async () => {
    const cookies = mockSession(mockedSession);

    const res = await middleware(makeReq('/onboarding', cookies));
    expect(res).toEqual({ type: 'next' });
  });

  it('redirects authenticated users with activeOrganizationSlug from root to org dashboard', async () => {
    const cookies = mockSession({
      ...mockedSession,
      session: {
        ...mockedSession.session,
        activeOrganizationId: 'org-1',
        activeOrganizationSlug: 'test-org',
      },
    });

    const res = await middleware(makeReq('/', cookies));
    expect(res?.type).toBe('redirect');
    expect(res?.url).toContain('/org/test-org/dashboard');
  });

  it('allows authenticated users with activeOrganizationSlug to access protected routes', async () => {
    const cookies = mockSession({
      ...mockedSession,
      session: {
        ...mockedSession.session,
        activeOrganizationId: 'org-1',
        activeOrganizationSlug: 'test-org',
      },
    });

    const res = await middleware(makeReq('/settings', cookies));
    expect(res).toEqual({ type: 'next' });
  });

  it('allows authenticated users with activeOrganizationSlug to access org routes', async () => {
    const cookies = mockSession({
      ...mockedSession,
      session: {
        ...mockedSession.session,
        activeOrganizationId: 'org-1',
        activeOrganizationSlug: 'test-org',
      },
    });

    const res = await middleware(makeReq('/org/test-org/dashboard', cookies));
    expect(res).toEqual({ type: 'next' });
  });

  it('redirects authenticated users trying to access sign-in routes', async () => {
    const cookies = mockSession({
      ...mockedSession,
      session: {
        ...mockedSession.session,
        activeOrganizationId: 'org-1',
        activeOrganizationSlug: 'test-org',
      },
    });

    const res = await middleware(makeReq('/sign-in', cookies));
    expect(res?.type).toBe('redirect');
    expect(res?.url).toContain('/org/test-org/dashboard');
  });

  it('calls NextResponse.next() for API routes', async () => {
    const res = await middleware(makeReq('/api/user'));
    expect(res).toEqual({ type: 'next' });
  });

  it('calls NextResponse.next() for tRPC routes', async () => {
    mockSession(null);
    const res = await middleware(makeReq('/api/trpc/user.list'));
    expect(res).toEqual({ type: 'next' });
  });

  it('allows authenticated users with activeOrganizationSlug to access public routes', async () => {
    const cookies = mockSession({
      ...mockedSession,
      session: {
        ...mockedSession.session,
        activeOrganizationId: 'org-1',
        activeOrganizationSlug: 'test-org',
      },
    });

    const res = await middleware(makeReq('/privacy', cookies));
    expect(res).toEqual({ type: 'next' });
  });

  it('redirects authenticated users without activeOrganizationSlug trying to access sign-in to onboarding', async () => {
    const cookies = mockSession(mockedSession);

    const res = await middleware(makeReq('/sign-in', cookies));
    expect(res?.type).toBe('redirect');
    expect(res?.url).toContain('/onboarding');
  });

  it('allows access to /sign-in/verify with valid sign_in_attempt_email cookie', async () => {
    const res = await middleware(
      makeReq('/sign-in/verify', { [SIGN_IN_ATTEMPT_EMAIL_COOKIE]: 'test@example.com' })
    );
    expect(res).toEqual({ type: 'next' });
  });

  it('redirects to /sign-in when accessing /sign-in/verify without sign_in_attempt_email cookie', async () => {
    const res = await middleware(makeReq('/sign-in/verify'));
    expect(res?.type).toBe('redirect');
    expect(res?.url).toContain('/sign-in');
  });

  it('redirects authenticated users without activeOrganizationSlug from root to onboarding', async () => {
    const cookies = mockSession(mockedSession);

    const res = await middleware(makeReq('/', cookies));
    expect(res?.type).toBe('redirect');
    expect(res?.url).toContain('/onboarding');
  });
});
