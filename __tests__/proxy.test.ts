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
    const cookies = mockSession({
      ...mockedSession,
      user: {
        ...mockedSession.user,
        role: 'admin',
      },
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

  /**
   * Regression tests for the middleware/proxy bypass class fixed in Next.js 16.2.5
   * (GHSA-492v-c6pp-mqqv, GHSA-267c-6grr-h53f, GHSA-36qx-fr4f-26g5).
   *
   * `createRouteMatcher` is the only thing gating anonymous access to every
   * non-public route, including the multi-tenant `/org/[slug]/...` segments.
   * These tests pin the matcher's boundaries so that widening it later — for
   * example switching the wildcard check to a bare `pathname.startsWith(baseRoute)`,
   * or matching on the raw request URL instead of the normalized pathname —
   * fails loudly instead of silently opening an authentication bypass.
   */
  describe('route matcher bypass regressions', () => {
    const expectGated = (res: { type: string; url?: string } | undefined, pathname: string) => {
      expect(res?.type).toBe('redirect');
      expect(res?.url).toContain('/sign-in');
      expect(res?.url).toContain(`redirect=${encodeURIComponent(pathname)}`);
    };

    it('does not treat a dot-traversal path that resolves to a protected route as public', async () => {
      // Raw path opens with the public `/sign-in` prefix but resolves to a
      // protected org route. A matcher reading the raw URL would allow it.
      const res = await proxy(makeReq('/sign-in/../org/acme/dashboard'));
      expectGated(res, '/org/acme/dashboard');
    });

    it('does not treat a traversal out of a public route into org settings as public', async () => {
      const res = await proxy(makeReq('/privacy/../settings/billing'));
      expectGated(res, '/settings/billing');
    });

    it('does not treat an encoded traversal inside a dynamic segment as public', async () => {
      // `%2f` is not decoded during URL normalization, so `..%2f..%2fsign-in`
      // stays a single opaque segment under `/org/[slug]` rather than climbing
      // out to `/sign-in`, and the request must remain gated.
      const res = await proxy(makeReq('/org/acme/..%2f..%2fsign-in'));
      expectGated(res, '/org/acme/..%2f..%2fsign-in');
    });

    it('does not treat a dynamic parameter containing a public route name as public', async () => {
      // `[slug]` === 'sign-in'. The public matcher must anchor on the full
      // pathname, never on a public route name appearing anywhere inside it.
      for (const pathname of ['/org/sign-in/dashboard', '/org/sign-up/settings', '/org/terms']) {
        const res = await proxy(makeReq(pathname));
        expectGated(res, pathname);
      }
    });

    it('does not treat a public route prefix without a segment boundary as public', async () => {
      // Wildcard routes like `/sign-in(.*)` must only match `/sign-in` or
      // `/sign-in/...`, and exact routes like `/terms` must not prefix-match at
      // all. A bare startsWith would wrongly make all of these public.
      for (const pathname of ['/sign-inevil', '/sign-in-attacker', '/terms-and-conditions']) {
        const res = await proxy(makeReq(pathname));
        expectGated(res, pathname);
      }
    });

    it('does not treat a double-slash variant of a public route as public', async () => {
      const res = await proxy(makeReq('//sign-in'));
      expectGated(res, '//sign-in');
    });

    it('matches on the normalized pathname, so the matcher and the router agree', async () => {
      // `/org/foo/../../sign-in` and its %2e-encoded form both normalize to
      // `/sign-in` before the matcher runs. Allowing them is correct precisely
      // because that is also the route Next.js will serve — matcher and router
      // must never disagree about which path is being requested.
      for (const pathname of ['/org/foo/../../sign-in', '/org/foo/%2e%2e/%2e%2e/sign-in']) {
        const req = makeReq(pathname);
        expect(req.nextUrl.pathname).toBe('/sign-in');
        expect(await proxy(req)).toEqual({ type: 'next' });
      }
    });
  });
});
