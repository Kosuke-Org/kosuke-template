/**
 * REST Authorization Guards
 *
 * The REST equivalent of the tRPC procedure ladder in `lib/trpc/init.ts`:
 *
 *   publicProcedure     -> (no guard)
 *   protectedProcedure  -> requireUser
 *   orgProcedure        -> requireOrgAccess
 *   orgOwnerProcedure   -> requireOrgOwner
 *   superAdminProcedure -> requireSuperAdmin
 *
 * Guards return a discriminated result instead of throwing, so a handler reads
 * as a straight line:
 *
 *   const access = await requireOrgAccess(request, organizationId);
 *   if (!access.ok) return access.response;
 *   // access.user / access.membership / access.role are now typed and safe
 *
 * Status codes and body shapes are produced by `ApiResponseHandler`, so they
 * match what the hand-written handlers returned before this module existed.
 */
import { NextResponse } from 'next/server';

import { ApiResponseHandler } from '@/lib/api/responses';
import { type Session, auth } from '@/lib/auth/providers';
import { db } from '@/lib/db/drizzle';
import type { Document, OrgMembership, OrgRole } from '@/lib/db/schema';
import { ORG_ROLES, USER_ROLES } from '@/lib/types/organization';

/** Anything with request headers: `Request`, `NextRequest`, or a test double. */
type GuardRequest = { headers: Headers };

type SessionUser = Session['user'];

/**
 * Discriminated guard result. On failure the caller returns `response` as-is;
 * on success the payload `T` is narrowed in and safe to destructure.
 */
type GuardResult<T> = ({ ok: true } & T) | { ok: false; response: NextResponse };

type UserGuard = GuardResult<{ user: SessionUser }>;
type OrgGuard = GuardResult<{
  user: SessionUser;
  membership: OrgMembership;
  role: OrgRole;
}>;
type DocumentGuard = GuardResult<{ document: Document }>;

const deny = (response: NextResponse) => ({ ok: false as const, response });

/**
 * Per-request session memo.
 *
 * Guards compose (`requireOrgOwner` -> `requireOrgAccess` -> `requireUser`), and
 * a handler may call more than one of them. The key is the request's `Headers`
 * instance, which is stable for the lifetime of one request, so a handler pays
 * for at most one `getSession` round trip.
 */
const sessionUserByHeaders = new WeakMap<Headers, Promise<SessionUser | null>>();

function getSessionUser(request: GuardRequest): Promise<SessionUser | null> {
  const cached = sessionUserByHeaders.get(request.headers);
  if (cached) return cached;

  const pending = auth.api
    // Disable the cookie cache so an authorization decision is never made from a
    // session snapshot that is up to `cookieCache.maxAge` old. This matches
    // `createTRPCContext` and keeps a revoked role or membership from surviving
    // in a cookie. The memo below means it still costs one lookup per request.
    .getSession({ headers: request.headers, query: { disableCookieCache: true } })
    .then((sessionData) => sessionData?.user ?? null);

  sessionUserByHeaders.set(request.headers, pending);
  return pending;
}

/**
 * Requires an authenticated user.
 * Mirrors `protectedProcedure`. Denies with 401 Unauthorized.
 */
export async function requireUser(request: GuardRequest): Promise<UserGuard> {
  const user = await getSessionUser(request);

  if (!user?.id) {
    return deny(ApiResponseHandler.unauthorized());
  }

  return { ok: true, user };
}

/**
 * Requires an authenticated user who is a member of `organizationId`.
 * Mirrors `orgProcedure`. Denies with 401, 400 (missing id) or 403.
 */
export async function requireOrgAccess(
  request: GuardRequest,
  organizationId: string | undefined
): Promise<OrgGuard> {
  const authenticated = await requireUser(request);
  if (!authenticated.ok) return authenticated;

  if (!organizationId) {
    return deny(ApiResponseHandler.badRequest('organizationId is required'));
  }

  const membership = await db.query.orgMemberships.findFirst({
    where: (memberships, { and, eq }) =>
      and(
        eq(memberships.organizationId, organizationId),
        eq(memberships.userId, authenticated.user.id)
      ),
  });

  if (!membership) {
    return deny(ApiResponseHandler.forbidden('You do not have access to this organization'));
  }

  return { ok: true, user: authenticated.user, membership, role: membership.role };
}

/**
 * Requires an authenticated user who owns `organizationId`.
 * Mirrors `orgOwnerProcedure`. Denies with 401, 400, or 403.
 */
export async function requireOrgOwner(
  request: GuardRequest,
  organizationId: string | undefined
): Promise<OrgGuard> {
  const access = await requireOrgAccess(request, organizationId);
  if (!access.ok) return access;

  if (access.role !== ORG_ROLES.OWNER) {
    return deny(ApiResponseHandler.forbidden('Only organization owners can perform this action'));
  }

  return access;
}

/**
 * Requires an authenticated platform admin.
 * Mirrors `superAdminProcedure`. Denies with 401 or 403.
 */
export async function requireSuperAdmin(request: GuardRequest): Promise<UserGuard> {
  const authenticated = await requireUser(request);
  if (!authenticated.ok) return authenticated;

  if (authenticated.user.role !== USER_ROLES.ADMIN) {
    return deny(ApiResponseHandler.forbidden('Admin access required'));
  }

  return authenticated;
}

/**
 * Resource guard: the document must exist AND belong to `organizationId`.
 *
 * Authorizing the organization is not enough on its own. A member of org A must
 * not be able to read a document row owned by org B by guessing its id. Lookup
 * is by primary key (download proxy) or by storage path (local file server).
 * Both return the same 404 for a missing row and for a cross-org hit, so the
 * response never confirms that another organization's document exists.
 */
export async function requireOrgDocument(
  organizationId: string,
  lookup: { documentId: string } | { storageUrl: string }
): Promise<DocumentGuard> {
  const document = await db.query.documents.findFirst({
    where: (docs, { and, eq }) =>
      and(
        eq(docs.organizationId, organizationId),
        'documentId' in lookup
          ? eq(docs.id, lookup.documentId)
          : eq(docs.storageUrl, lookup.storageUrl)
      ),
  });

  if (!document) {
    return deny(ApiResponseHandler.notFound('Document not found'));
  }

  return { ok: true, document };
}
