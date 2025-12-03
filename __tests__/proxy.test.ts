import { NextRequest } from 'next/server';

import { proxy } from '@/proxy';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Session } from '@/lib/auth/providers';
import { SIGN_IN_ATTEMPT_EMAIL_COOKIE } from '@/lib/auth/utils';

import { mockedSession } from './setup/mocks';
import { encodeSessionCookie } from './setup/utils';

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

describe('proxy', () => {
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
    const res = await proxy(makeReq('/terms'));
    expect(res).toEqual({ type: 'next' });
  });

  it('allows public routes (home, privacy, terms) for unauthenticated users', async () => {
    const res = await proxy(makeReq('/home'));
    expect(res).toEqual({ type: 'next' });
  });

  it('redirects unauthenticated users on protected routes', async () => {
    const res = await proxy(makeReq('/settings'));
    expect(res?.type).toBe('redirect');
    expect(res?.url).toContain('/sign-in');
    expect(res?.url).toContain('redirect=%2Fsettings');
  });

  it('redirects unauthenticated users on org routes', async () => {
    const res = await proxy(makeReq('/org/test-org/dashboard'));
    expect(res?.type).toBe('redirect');
    expect(res?.url).toContain('/sign-in');
  });

  it('redirects authenticated users without activeOrganizationSlug to onboarding', async () => {
    const cookies = mockSession(mockedSession);

    const res = await proxy(makeReq('/settings', cookies));
    expect(res?.type).toBe('redirect');
    expect(res?.url).toContain('/onboarding');
  });

  it('allows authenticated users without activeOrganizationSlug to access onboarding', async () => {
    const cookies = mockSession(mockedSession);

    const res = await proxy(makeReq('/onboarding', cookies));
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

    const res = await proxy(makeReq('/', cookies));
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

    const res = await proxy(makeReq('/settings', cookies));
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

    const res = await proxy(makeReq('/org/test-org/dashboard', cookies));
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

    const res = await proxy(makeReq('/sign-in', cookies));
    expect(res?.type).toBe('redirect');
    expect(res?.url).toContain('/org/test-org/dashboard');
  });

  it('calls NextResponse.next() for API routes', async () => {
    const res = await proxy(makeReq('/api/user'));
    expect(res).toEqual({ type: 'next' });
  });

  it('calls NextResponse.next() for tRPC routes', async () => {
    const res = await proxy(makeReq('/api/trpc/user.list'));
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

    const res = await proxy(makeReq('/privacy', cookies));
    expect(res).toEqual({ type: 'next' });
  });

  it('redirects authenticated users without activeOrganizationSlug trying to access sign-in to onboarding', async () => {
    const cookies = mockSession(mockedSession);

    const res = await proxy(makeReq('/sign-in', cookies));
    expect(res?.type).toBe('redirect');
    expect(res?.url).toContain('/onboarding');
  });

  it('allows access to /sign-in/verify with valid sign_in_attempt_email cookie', async () => {
    const res = await proxy(
      makeReq('/sign-in/verify', { [SIGN_IN_ATTEMPT_EMAIL_COOKIE]: 'test@example.com' })
    );
    expect(res).toEqual({ type: 'next' });
  });

  it('redirects to /sign-in when accessing /sign-in/verify without sign_in_attempt_email cookie', async () => {
    const res = await proxy(makeReq('/sign-in/verify'));
    expect(res?.type).toBe('redirect');
    expect(res?.url).toContain('/sign-in');
  });

  it('redirects authenticated users without activeOrganizationSlug from root to onboarding', async () => {
    const cookies = mockSession(mockedSession);

    const res = await proxy(makeReq('/', cookies));
    expect(res?.type).toBe('redirect');
    expect(res?.url).toContain('/onboarding');
  });

  it('redirects authenticated users to admin dashboard if they are super admin', async () => {
    vi.stubEnv('SUPER_ADMIN_EMAILS', 'test@example.com');
    const cookies = mockSession({
      ...mockedSession,
      // user email is already 'test@example.com' in mockedSession
      session: {
        ...mockedSession.session,
        activeOrganizationId: 'org-1',
        activeOrganizationSlug: 'test-org',
      },
    });

    const res = await proxy(makeReq('/admin', cookies));
    expect(res?.type).toBe('next');
  });

  it('redirects authenticated users to org dashboard if they are not super admin', async () => {
    vi.stubEnv('SUPER_ADMIN_EMAILS', '');

    const cookies = mockSession({
      ...mockedSession,
      session: {
        ...mockedSession.session,
        activeOrganizationId: 'org-1',
        activeOrganizationSlug: 'test-org',
      },
    });

    const res = await proxy(makeReq('/admin', cookies));
    expect(res?.type).toBe('redirect');
    expect(res?.url).toContain('/org/test-org/dashboard');
  });
});
