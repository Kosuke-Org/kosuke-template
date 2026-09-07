import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  requireOrgAccess,
  requireOrgDocument,
  requireOrgOwner,
  requireSuperAdmin,
  requireUser,
} from '@/lib/auth/guards';

// Mock Better Auth
vi.mock('@/lib/auth/providers', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

// Mock the database
vi.mock('@/lib/db/drizzle', () => ({
  db: {
    query: {
      orgMemberships: { findFirst: vi.fn() },
      documents: { findFirst: vi.fn() },
    },
  },
}));

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyMock = any;

const ORG_ID = 'org-1';
const OTHER_ORG_ID = 'org-2';
const USER_ID = 'user-1';
const DOCUMENT_ID = 'doc-1';

const memberUser = {
  id: USER_ID,
  email: 'member@example.com',
  role: 'user',
};

const adminUser = { ...memberUser, id: 'user-admin', role: 'admin' };

const membership = {
  id: 'membership-1',
  organizationId: ORG_ID,
  userId: USER_ID,
  role: 'member',
  createdAt: new Date('2024-01-01'),
};

const ownerMembership = { ...membership, id: 'membership-2', role: 'owner' };

const document = {
  id: DOCUMENT_ID,
  organizationId: ORG_ID,
  userId: USER_ID,
  displayName: 'contract.pdf',
  storageUrl: `documents/${ORG_ID}/contract.pdf`,
};

/**
 * Each call gets a fresh Request: guards memoize the resolved session on the
 * request's Headers instance, so reusing one across cases would leak state.
 */
const makeRequest = () => new Request('https://example.com/api/resource');

/**
 * Run a captured drizzle `where` callback against recording stubs so tests can
 * assert which columns the guard actually filtered on.
 */
function readWhereConditions(where: AnyMock): Array<[string, unknown]> {
  const conditions: Array<[string, unknown]> = [];
  const table = new Proxy({}, { get: (_target, prop) => String(prop) });
  const eq = (column: string, value: unknown) => conditions.push([column, value]);
  const and = (...args: unknown[]) => args;

  where(table, { and, eq });

  return conditions;
}

describe('Auth guards', () => {
  let auth: AnyMock;
  let db: AnyMock;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ auth } = await import('@/lib/auth/providers'));
    ({ db } = await import('@/lib/db/drizzle'));
  });

  describe('requireUser', () => {
    it('denies with 401 when there is no session', async () => {
      auth.api.getSession.mockResolvedValue(null);

      const result = await requireUser(makeRequest());

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected denial');
      expect(result.response.status).toBe(401);
      await expect(result.response.json()).resolves.toEqual({
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
      });
    });

    it('denies with 401 when the session carries no user', async () => {
      auth.api.getSession.mockResolvedValue({ session: { id: 'session-1' } });

      const result = await requireUser(makeRequest());

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected denial');
      expect(result.response.status).toBe(401);
    });

    it('returns the user for a valid session', async () => {
      auth.api.getSession.mockResolvedValue({ user: memberUser });

      const result = await requireUser(makeRequest());

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('expected success');
      expect(result.user).toEqual(memberUser);
    });

    it('bypasses the cookie cache so a revoked session cannot linger', async () => {
      auth.api.getSession.mockResolvedValue({ user: memberUser });
      const request = makeRequest();

      await requireUser(request);

      expect(auth.api.getSession).toHaveBeenCalledWith({
        headers: request.headers,
        query: { disableCookieCache: true },
      });
    });
  });

  describe('requireOrgAccess', () => {
    it('denies with 401 when there is no session', async () => {
      auth.api.getSession.mockResolvedValue(null);

      const result = await requireOrgAccess(makeRequest(), ORG_ID);

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected denial');
      expect(result.response.status).toBe(401);
      expect(db.query.orgMemberships.findFirst).not.toHaveBeenCalled();
    });

    it('denies with 400 when organizationId is missing', async () => {
      auth.api.getSession.mockResolvedValue({ user: memberUser });

      const result = await requireOrgAccess(makeRequest(), undefined);

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected denial');
      expect(result.response.status).toBe(400);
      await expect(result.response.json()).resolves.toEqual({
        error: 'organizationId is required',
        code: 'BAD_REQUEST',
      });
      expect(db.query.orgMemberships.findFirst).not.toHaveBeenCalled();
    });

    it('denies with 403 for a valid session with no membership', async () => {
      auth.api.getSession.mockResolvedValue({ user: memberUser });
      db.query.orgMemberships.findFirst.mockResolvedValue(undefined);

      const result = await requireOrgAccess(makeRequest(), OTHER_ORG_ID);

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected denial');
      expect(result.response.status).toBe(403);
      await expect(result.response.json()).resolves.toEqual({
        error: 'You do not have access to this organization',
        code: 'FORBIDDEN',
      });
    });

    it('returns user, membership and role for a valid membership', async () => {
      auth.api.getSession.mockResolvedValue({ user: memberUser });
      db.query.orgMemberships.findFirst.mockResolvedValue(membership);

      const result = await requireOrgAccess(makeRequest(), ORG_ID);

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('expected success');
      expect(result.user).toEqual(memberUser);
      expect(result.membership).toEqual(membership);
      expect(result.role).toBe('member');
    });

    it('scopes the membership lookup to both the organization and the user', async () => {
      auth.api.getSession.mockResolvedValue({ user: memberUser });
      db.query.orgMemberships.findFirst.mockResolvedValue(membership);

      await requireOrgAccess(makeRequest(), ORG_ID);

      const { where } = db.query.orgMemberships.findFirst.mock.calls[0][0];
      expect(readWhereConditions(where)).toEqual([
        ['organizationId', ORG_ID],
        ['userId', USER_ID],
      ]);
    });

    it('resolves the session once when guards compose', async () => {
      auth.api.getSession.mockResolvedValue({ user: memberUser });
      db.query.orgMemberships.findFirst.mockResolvedValue(ownerMembership);
      const request = makeRequest();

      await requireUser(request);
      await requireOrgAccess(request, ORG_ID);
      await requireOrgOwner(request, ORG_ID);

      expect(auth.api.getSession).toHaveBeenCalledTimes(1);
    });
  });

  describe('requireOrgOwner', () => {
    it('denies with 401 when there is no session', async () => {
      auth.api.getSession.mockResolvedValue(null);

      const result = await requireOrgOwner(makeRequest(), ORG_ID);

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected denial');
      expect(result.response.status).toBe(401);
    });

    it('denies with 403 for a valid session with no membership', async () => {
      auth.api.getSession.mockResolvedValue({ user: memberUser });
      db.query.orgMemberships.findFirst.mockResolvedValue(undefined);

      const result = await requireOrgOwner(makeRequest(), ORG_ID);

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected denial');
      expect(result.response.status).toBe(403);
      await expect(result.response.json()).resolves.toEqual({
        error: 'You do not have access to this organization',
        code: 'FORBIDDEN',
      });
    });

    it('denies with 403 when the member has the wrong role', async () => {
      auth.api.getSession.mockResolvedValue({ user: memberUser });
      db.query.orgMemberships.findFirst.mockResolvedValue({ ...membership, role: 'admin' });

      const result = await requireOrgOwner(makeRequest(), ORG_ID);

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected denial');
      expect(result.response.status).toBe(403);
      await expect(result.response.json()).resolves.toEqual({
        error: 'Only organization owners can perform this action',
        code: 'FORBIDDEN',
      });
    });

    it('returns the membership for an owner', async () => {
      auth.api.getSession.mockResolvedValue({ user: memberUser });
      db.query.orgMemberships.findFirst.mockResolvedValue(ownerMembership);

      const result = await requireOrgOwner(makeRequest(), ORG_ID);

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('expected success');
      expect(result.role).toBe('owner');
      expect(result.membership).toEqual(ownerMembership);
    });
  });

  describe('requireSuperAdmin', () => {
    it('denies with 401 when there is no session', async () => {
      auth.api.getSession.mockResolvedValue(null);

      const result = await requireSuperAdmin(makeRequest());

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected denial');
      expect(result.response.status).toBe(401);
    });

    it('denies with 403 when the user has the wrong role', async () => {
      auth.api.getSession.mockResolvedValue({ user: memberUser });

      const result = await requireSuperAdmin(makeRequest());

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected denial');
      expect(result.response.status).toBe(403);
      await expect(result.response.json()).resolves.toEqual({
        error: 'Admin access required',
        code: 'FORBIDDEN',
      });
    });

    it('returns the user for a platform admin', async () => {
      auth.api.getSession.mockResolvedValue({ user: adminUser });

      const result = await requireSuperAdmin(makeRequest());

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('expected success');
      expect(result.user).toEqual(adminUser);
    });
  });

  describe('requireOrgDocument', () => {
    it('returns the document when it belongs to the organization', async () => {
      db.query.documents.findFirst.mockResolvedValue(document);

      const result = await requireOrgDocument(ORG_ID, { documentId: DOCUMENT_ID });

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('expected success');
      expect(result.document).toEqual(document);
    });

    it('denies with 404 when the document belongs to another organization', async () => {
      // The row exists, but the org-scoped lookup does not match it.
      db.query.documents.findFirst.mockResolvedValue(undefined);

      const result = await requireOrgDocument(OTHER_ORG_ID, { documentId: DOCUMENT_ID });

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected denial');
      expect(result.response.status).toBe(404);
      await expect(result.response.json()).resolves.toEqual({
        error: 'Document not found',
        code: 'NOT_FOUND',
      });

      const { where } = db.query.documents.findFirst.mock.calls[0][0];
      expect(readWhereConditions(where)).toEqual([
        ['organizationId', OTHER_ORG_ID],
        ['id', DOCUMENT_ID],
      ]);
    });

    it('denies with 404 when the document does not exist', async () => {
      db.query.documents.findFirst.mockResolvedValue(undefined);

      const result = await requireOrgDocument(ORG_ID, { documentId: 'missing' });

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected denial');
      expect(result.response.status).toBe(404);
    });

    it('scopes a storage-path lookup to the organization', async () => {
      db.query.documents.findFirst.mockResolvedValue(document);

      const result = await requireOrgDocument(ORG_ID, { storageUrl: document.storageUrl });

      expect(result.ok).toBe(true);

      const { where } = db.query.documents.findFirst.mock.calls[0][0];
      expect(readWhereConditions(where)).toEqual([
        ['organizationId', ORG_ID],
        ['storageUrl', document.storageUrl],
      ]);
    });

    it('denies with 404 when a storage path belongs to another organization', async () => {
      db.query.documents.findFirst.mockResolvedValue(undefined);

      const result = await requireOrgDocument(OTHER_ORG_ID, {
        storageUrl: document.storageUrl,
      });

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected denial');
      expect(result.response.status).toBe(404);
    });
  });
});
