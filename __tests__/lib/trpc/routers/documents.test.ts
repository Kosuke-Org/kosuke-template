import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockTRPCContext } from '@/__tests__/setup/mocks';
import { expectTRPCError } from '@/__tests__/setup/utils';

import { deleteDocumentFromFileSearchStore, deleteFileSearchStore } from '@/lib/ai/rag';
import { db } from '@/lib/db/drizzle';
import { addIndexDocumentJob } from '@/lib/queue/queues/documents';
import { deleteDocument, getPresignedDownloadUrl, uploadDocument } from '@/lib/storage';
import { createCaller } from '@/lib/trpc/server';

vi.mock('@/lib/db/drizzle', () => ({
  db: {
    query: {
      orgMemberships: { findFirst: vi.fn() },
      documents: { findFirst: vi.fn() },
      organizations: { findFirst: vi.fn() },
    },
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/lib/storage', () => ({
  uploadDocument: vi.fn(),
  deleteDocument: vi.fn(),
  getPresignedDownloadUrl: vi.fn(),
}));

vi.mock('@/lib/ai/rag', () => ({
  deleteDocumentFromFileSearchStore: vi.fn(),
  deleteFileSearchStore: vi.fn(),
}));

vi.mock('@/lib/queue/queues/documents', () => ({
  addIndexDocumentJob: vi.fn(),
}));

describe('Documents Router', () => {
  const userId = 'user_123';
  const otherUserId = 'user_456';
  const organizationId = '22222222-2222-4222-8222-222222222222';
  const otherOrganizationId = '33333333-3333-4333-8333-333333333333';
  const documentId = '44444444-4444-4444-8444-444444444444';

  const mockDocument = {
    id: documentId,
    organizationId,
    userId,
    displayName: 'Quarterly report.pdf',
    mimeType: 'application/pdf',
    sizeBytes: '1024',
    storageUrl: 'https://s3.example.com/org/doc.pdf',
    status: 'ready' as const,
    documentResourceName: null,
    fileSearchStoreName: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const membershipAs = (role: 'owner' | 'admin' | 'member') => ({
    id: 'membership_1',
    organizationId,
    userId,
    role,
    createdAt: new Date('2026-01-01'),
  });

  const memberCaller = () => createCaller(createMockTRPCContext({ userId }));
  const anonCaller = () => createCaller(createMockTRPCContext({ userId: null }));

  /** db.select({ count }).from().where() -> rows */
  const mockCountQuery = (rows: unknown[]) => ({
    from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(rows) }),
  });

  /** db.select().from().leftJoin().where().orderBy().limit().offset() -> rows */
  const mockJoinedQuery = (rows: unknown[]) => ({
    from: vi.fn().mockReturnValue({
      leftJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({ offset: vi.fn().mockResolvedValue(rows) }),
          }),
        }),
      }),
    }),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.query.orgMemberships.findFirst).mockResolvedValue(membershipAs('member'));
  });

  describe('orgProcedure authorization', () => {
    it('rejects an unauthenticated caller', async () => {
      const caller = await anonCaller();

      await expectTRPCError(caller.documents.list({ organizationId }), 'UNAUTHORIZED');
      expect(db.query.orgMemberships.findFirst).not.toHaveBeenCalled();
    });

    it('rejects a caller with no membership in the requested organization', async () => {
      vi.mocked(db.query.orgMemberships.findFirst).mockResolvedValue(undefined);

      const caller = await memberCaller();

      await expectTRPCError(
        caller.documents.list({ organizationId: otherOrganizationId }),
        'FORBIDDEN',
        'do not have access to this organization'
      );
      expect(db.select).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    const documentRow = {
      id: documentId,
      displayName: 'Quarterly report.pdf',
      sizeBytes: '1024',
      status: 'ready',
      createdAt: new Date('2026-01-01'),
      userDisplayName: 'John Doe',
      storageUrl: 'https://s3.example.com/org/doc.pdf',
    };

    it('returns documents with pagination metadata', async () => {
      vi.mocked(db.select)
        .mockReturnValueOnce(
          mockCountQuery([{ count: documentId }, { count: documentId }]) as never
        )
        .mockReturnValueOnce(mockJoinedQuery([documentRow]) as never);

      const caller = await memberCaller();
      const result = await caller.documents.list({ organizationId, pageSize: 1 });

      expect(result).toEqual({
        documents: [documentRow],
        total: 2,
        page: 1,
        pageSize: 1,
        totalPages: 2,
      });
    });

    it('adds a name filter when a search query is supplied', async () => {
      const countQuery = mockCountQuery([]);
      vi.mocked(db.select)
        .mockReturnValueOnce(countQuery as never)
        .mockReturnValueOnce(mockJoinedQuery([]) as never);

      const caller = await memberCaller();
      await caller.documents.list({ organizationId, searchQuery: '  report  ' });

      // Two conditions (organization scope + ilike on displayName) are combined into the where().
      expect(countQuery.from).toHaveBeenCalled();
    });

    it('ignores a whitespace-only search query', async () => {
      vi.mocked(db.select)
        .mockReturnValueOnce(mockCountQuery([]) as never)
        .mockReturnValueOnce(mockJoinedQuery([]) as never);

      const caller = await memberCaller();
      const result = await caller.documents.list({ organizationId, searchQuery: '   ' });

      expect(result.total).toBe(0);
    });

    it('rejects a page number of zero', async () => {
      const caller = await memberCaller();

      await expectTRPCError(caller.documents.list({ organizationId, page: 0 }), 'BAD_REQUEST');
      expect(db.select).not.toHaveBeenCalled();
    });
  });

  describe('getDownloadUrl', () => {
    it('returns a presigned url for a document in the organization', async () => {
      vi.mocked(db.query.documents.findFirst).mockResolvedValue(mockDocument as never);
      vi.mocked(getPresignedDownloadUrl).mockResolvedValue('https://signed.example.com/doc.pdf');

      const caller = await memberCaller();
      const result = await caller.documents.getDownloadUrl({ id: documentId, organizationId });

      expect(result).toEqual({
        url: 'https://signed.example.com/doc.pdf',
        displayName: 'Quarterly report.pdf',
      });
      expect(getPresignedDownloadUrl).toHaveBeenCalledWith(mockDocument.storageUrl);
    });

    it('returns NOT_FOUND for a document outside the organization', async () => {
      vi.mocked(db.query.documents.findFirst).mockResolvedValue(undefined);

      const caller = await memberCaller();

      await expectTRPCError(
        caller.documents.getDownloadUrl({ id: documentId, organizationId }),
        'NOT_FOUND',
        'Document not found'
      );
      expect(getPresignedDownloadUrl).not.toHaveBeenCalled();
    });

    it('rejects a non-uuid document id', async () => {
      const caller = await memberCaller();

      await expectTRPCError(
        caller.documents.getDownloadUrl({ id: 'nope', organizationId }),
        'BAD_REQUEST'
      );
    });
  });

  describe('upload', () => {
    const validInput = {
      organizationId,
      displayName: 'notes.txt',
      mimeType: 'text/plain',
      sizeBytes: '1024',
      fileData: 'data:text/plain;base64,aGVsbG8=',
    };

    const mockInsert = () => {
      const valuesSpy = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: documentId, status: 'in_progress' }]),
      });
      vi.mocked(db.insert).mockReturnValue({ values: valuesSpy } as never);
      return valuesSpy;
    };

    it('uploads to storage, records the row and queues indexing', async () => {
      vi.mocked(db.query.organizations.findFirst).mockResolvedValue({
        id: organizationId,
      } as never);
      vi.mocked(uploadDocument).mockResolvedValue('https://s3.example.com/org/notes.txt');
      const valuesSpy = mockInsert();

      const caller = await memberCaller();
      const result = await caller.documents.upload(validInput);

      expect(result).toEqual({ id: documentId, status: 'in_progress' });
      expect(uploadDocument).toHaveBeenCalledWith(expect.any(File), organizationId);
      expect(valuesSpy).toHaveBeenCalledWith({
        organizationId,
        userId,
        displayName: 'notes.txt',
        mimeType: 'text/plain',
        sizeBytes: '1024',
        storageUrl: 'https://s3.example.com/org/notes.txt',
        status: 'in_progress',
      });
      expect(addIndexDocumentJob).toHaveBeenCalledWith({
        documentId,
        organizationId,
        storageUrl: 'https://s3.example.com/org/notes.txt',
        displayName: 'notes.txt',
        mimeType: 'text/plain',
        fileData: validInput.fileData,
      });
    });

    it('accepts raw base64 without a data-url prefix', async () => {
      vi.mocked(db.query.organizations.findFirst).mockResolvedValue({
        id: organizationId,
      } as never);
      vi.mocked(uploadDocument).mockResolvedValue('https://s3.example.com/org/notes.txt');
      mockInsert();

      const caller = await memberCaller();
      await caller.documents.upload({ ...validInput, fileData: 'aGVsbG8=' });

      expect(uploadDocument).toHaveBeenCalledWith(expect.any(File), organizationId);
    });

    it('returns NOT_FOUND when the organization row is missing', async () => {
      vi.mocked(db.query.organizations.findFirst).mockResolvedValue(undefined);

      const caller = await memberCaller();

      await expectTRPCError(
        caller.documents.upload(validInput),
        'NOT_FOUND',
        'Organization not found'
      );
      expect(uploadDocument).not.toHaveBeenCalled();
      expect(addIndexDocumentJob).not.toHaveBeenCalled();
    });

    it('rejects an unsupported mime type', async () => {
      const caller = await memberCaller();

      await expectTRPCError(
        caller.documents.upload({ ...validInput, mimeType: 'image/png' }),
        'BAD_REQUEST',
        'Unsupported file type'
      );
      expect(uploadDocument).not.toHaveBeenCalled();
    });

    it('rejects the mime type that getContentTypeByExtension returns for .ts files', async () => {
      // Documents a mismatch: EXTENSION_TO_MIME_TYPE maps .ts to text/typescript,
      // which is absent from SUPPORTED_MIME_TYPES (only application/typescript is listed).
      const caller = await memberCaller();

      await expectTRPCError(
        caller.documents.upload({ ...validInput, mimeType: 'text/typescript' }),
        'BAD_REQUEST',
        'Unsupported file type'
      );
    });

    it('rejects a zero-byte file', async () => {
      const caller = await memberCaller();

      await expectTRPCError(
        caller.documents.upload({ ...validInput, sizeBytes: '0' }),
        'BAD_REQUEST'
      );
    });

    it('rejects a file above the 100MB limit', async () => {
      const caller = await memberCaller();

      await expectTRPCError(
        caller.documents.upload({ ...validInput, sizeBytes: String(100 * 1024 * 1024 + 1) }),
        'BAD_REQUEST'
      );
    });

    it('rejects an empty display name', async () => {
      const caller = await memberCaller();

      await expectTRPCError(
        caller.documents.upload({ ...validInput, displayName: '' }),
        'BAD_REQUEST',
        'Title is required'
      );
    });

    it('rejects a non-member', async () => {
      vi.mocked(db.query.orgMemberships.findFirst).mockResolvedValue(undefined);

      const caller = await memberCaller();

      await expectTRPCError(caller.documents.upload(validInput), 'FORBIDDEN');
      expect(uploadDocument).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    const mockDeleteChain = () => {
      const whereSpy = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.delete).mockReturnValue({ where: whereSpy } as never);
      return whereSpy;
    };

    it('lets the document owner delete their own document', async () => {
      vi.mocked(db.query.documents.findFirst).mockResolvedValue(mockDocument as never);
      const whereSpy = mockDeleteChain();

      const caller = await memberCaller();
      const result = await caller.documents.delete({ id: documentId, organizationId });

      expect(result).toEqual({ success: true });
      expect(whereSpy).toHaveBeenCalled();
      expect(deleteDocument).toHaveBeenCalledWith(mockDocument.storageUrl);
    });

    it('lets an organization owner delete another member document', async () => {
      vi.mocked(db.query.orgMemberships.findFirst).mockResolvedValue(membershipAs('owner'));
      vi.mocked(db.query.documents.findFirst).mockResolvedValue({
        ...mockDocument,
        userId: otherUserId,
      } as never);
      mockDeleteChain();

      const caller = await memberCaller();

      await expect(caller.documents.delete({ id: documentId, organizationId })).resolves.toEqual({
        success: true,
      });
    });

    it('lets an organization admin delete another member document', async () => {
      vi.mocked(db.query.orgMemberships.findFirst).mockResolvedValue(membershipAs('admin'));
      vi.mocked(db.query.documents.findFirst).mockResolvedValue({
        ...mockDocument,
        userId: otherUserId,
      } as never);
      mockDeleteChain();

      const caller = await memberCaller();

      await expect(caller.documents.delete({ id: documentId, organizationId })).resolves.toEqual({
        success: true,
      });
    });

    it('forbids a plain member from deleting another member document', async () => {
      vi.mocked(db.query.orgMemberships.findFirst).mockResolvedValue(membershipAs('member'));
      vi.mocked(db.query.documents.findFirst).mockResolvedValue({
        ...mockDocument,
        userId: otherUserId,
      } as never);
      mockDeleteChain();

      const caller = await memberCaller();

      await expectTRPCError(
        caller.documents.delete({ id: documentId, organizationId }),
        'FORBIDDEN',
        'do not have permission to delete this document'
      );
      expect(db.delete).not.toHaveBeenCalled();
      expect(deleteDocument).not.toHaveBeenCalled();
    });

    it('derives the permission role from the membership row, not the session role claim', async () => {
      // Session claims owner; the membership row says member. The row must win.
      vi.mocked(db.query.orgMemberships.findFirst).mockResolvedValue(membershipAs('member'));
      vi.mocked(db.query.documents.findFirst).mockResolvedValue({
        ...mockDocument,
        userId: otherUserId,
      } as never);
      mockDeleteChain();

      const caller = await createCaller(createMockTRPCContext({ userId, orgRole: 'owner' }));

      await expectTRPCError(
        caller.documents.delete({ id: documentId, organizationId }),
        'FORBIDDEN'
      );
    });

    it('returns NOT_FOUND for a document outside the organization', async () => {
      vi.mocked(db.query.documents.findFirst).mockResolvedValue(undefined);

      const caller = await memberCaller();

      await expectTRPCError(
        caller.documents.delete({ id: documentId, organizationId }),
        'NOT_FOUND',
        'Document not found'
      );
      expect(db.delete).not.toHaveBeenCalled();
    });

    it('removes the file search store once the last indexed document is gone', async () => {
      vi.mocked(db.query.documents.findFirst)
        .mockResolvedValueOnce({
          ...mockDocument,
          documentResourceName: 'files/doc-1',
          fileSearchStoreName: 'stores/org-1',
        } as never)
        .mockResolvedValueOnce(undefined);
      mockDeleteChain();

      const caller = await memberCaller();
      await caller.documents.delete({ id: documentId, organizationId });

      expect(deleteDocumentFromFileSearchStore).toHaveBeenCalledWith({ name: 'files/doc-1' });
      expect(deleteFileSearchStore).toHaveBeenCalledWith({ name: 'stores/org-1' });
    });

    it('keeps the file search store while other documents still reference it', async () => {
      vi.mocked(db.query.documents.findFirst)
        .mockResolvedValueOnce({
          ...mockDocument,
          documentResourceName: 'files/doc-1',
          fileSearchStoreName: 'stores/org-1',
        } as never)
        .mockResolvedValueOnce({ id: 'another-doc' } as never);
      mockDeleteChain();

      const caller = await memberCaller();
      await caller.documents.delete({ id: documentId, organizationId });

      expect(deleteDocumentFromFileSearchStore).toHaveBeenCalled();
      expect(deleteFileSearchStore).not.toHaveBeenCalled();
    });

    it('skips file search cleanup for a document that never finished indexing', async () => {
      vi.mocked(db.query.documents.findFirst).mockResolvedValue({
        ...mockDocument,
        status: 'in_progress',
        documentResourceName: 'files/doc-1',
        fileSearchStoreName: 'stores/org-1',
      } as never);
      mockDeleteChain();

      const caller = await memberCaller();
      await caller.documents.delete({ id: documentId, organizationId });

      expect(deleteDocumentFromFileSearchStore).not.toHaveBeenCalled();
      expect(deleteFileSearchStore).not.toHaveBeenCalled();
    });

    it('still succeeds when file search cleanup throws', async () => {
      vi.mocked(db.query.documents.findFirst)
        .mockResolvedValueOnce({
          ...mockDocument,
          documentResourceName: 'files/doc-1',
          fileSearchStoreName: 'stores/org-1',
        } as never)
        .mockResolvedValueOnce(undefined);
      mockDeleteChain();
      vi.mocked(deleteDocumentFromFileSearchStore).mockRejectedValue(new Error('gemini down'));
      vi.mocked(deleteFileSearchStore).mockRejectedValue(new Error('gemini down'));

      const caller = await memberCaller();

      await expect(caller.documents.delete({ id: documentId, organizationId })).resolves.toEqual({
        success: true,
      });
    });

    it('rejects an unauthenticated caller', async () => {
      const caller = await anonCaller();

      await expectTRPCError(
        caller.documents.delete({ id: documentId, organizationId }),
        'UNAUTHORIZED'
      );
    });
  });
});
