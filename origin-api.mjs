/**
 * The reproduction's API service, shaped like the app the outage was reported on.
 *
 * Two things about it matter and nothing else does:
 *
 *   - Which cookie holds the session is decided by string-matching the caller's
 *     service name in `Origin`. That is `getLoginType` in the reported app, and
 *     it is why a rewritten `Origin` costs the request its identity.
 *   - One endpoint reads its cookie by name instead, so it is unaffected. That is
 *     why the failure is partial rather than total: the tenant list loads while
 *     the profile 401s, which is exactly how the outage was described.
 */
import { createServer } from 'node:http';

const PORT = Number(process.env.ORIGIN_API_PORT ?? 3005);
const SESSION_COOKIE = 'office_jwt';
const FALLBACK_COOKIE = 'jwt';

/** The frontend this API is meant to be called by. */
const OFFICE_SERVICE = 'nextjs';

const TENANTS = [
  { id: 'tn_01', name: 'Northwind', plan: 'Enterprise' },
  { id: 'tn_02', name: 'Initech', plan: 'Growth' },
  { id: 'tn_03', name: 'Umbrella', plan: 'Starter' },
];

/**
 * Which cookie this caller's session lives in.
 *
 * `origin || referer`, in that order, is the reported app's own precedence, and
 * it is load-bearing here: the proxy always sets an `Origin`, so the `Referer` —
 * which still names the real caller — is never consulted.
 */
function sessionCookieName(req) {
  const source = req.headers.origin || req.headers.referer || '';
  return source.includes(OFFICE_SERVICE) ? SESSION_COOKIE : FALLBACK_COOKIE;
}

function readCookie(req, name) {
  const raw = req.headers.cookie;
  if (!raw) return null;
  for (const part of raw.split(/;\s*/)) {
    const eq = part.indexOf('=');
    if (eq > 0 && part.slice(0, eq) === name) return part.slice(eq + 1);
  }
  return null;
}

function send(req, res, status, body, extra = {}) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json',
    'cache-control': 'no-store',
    'access-control-allow-origin': req.headers.origin ?? '*',
    'access-control-allow-credentials': 'true',
    ...extra,
  });
  res.end(text);
}

const server = createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');

  if (req.method === 'OPTIONS') {
    return send(req, res, 204, null, {
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
    });
  }

  // Sign in. Unconditional, so nothing about the failure below is about whether
  // the session exists: it always does by the time anything else is called.
  if (pathname === '/session' && req.method === 'POST') {
    return send(req, res, 200, { ok: true }, {
      'set-cookie': `${SESSION_COOKIE}=granted; Path=/; HttpOnly; SameSite=None; Secure`,
    });
  }

  // Guarded by the cookie's name, the way the reported app's AdminGuard is.
  // Independent of `Origin`, so this endpoint keeps working throughout.
  if (pathname === '/tenants') {
    if (!readCookie(req, SESSION_COOKIE)) {
      return send(req, res, 401, { message: 'No token found', name: 'UnauthorizedException' });
    }
    return send(req, res, 200, { tenants: TENANTS });
  }

  // Guarded the same way, but the handler resolves the session through the
  // Origin-derived name. When `Origin` has lost the calling service, the name
  // resolves to a cookie that was never set and the request is refused.
  if (pathname === '/me') {
    if (!readCookie(req, sessionCookieName(req))) {
      return send(req, res, 401, { message: 'No token found', name: 'UnauthorizedException' });
    }
    return send(req, res, 200, {
      user: { name: 'Dana Whitfield', email: 'dana@northwind.example', role: 'Administrator' },
    });
  }

  // Not part of the app. The harness reads the headers here so a run can report
  // the mechanism, while the pages above only ever show the symptom.
  if (pathname === '/_headers') {
    return send(req, res, 200, { headers: req.headers });
  }

  return send(req, res, 404, { message: 'Not found' });
});

server.listen(PORT, '0.0.0.0', () => console.log(`[origin-api] listening on ${PORT}`));
