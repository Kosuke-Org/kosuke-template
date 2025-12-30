/**
 * RAG Service Tests
 * Tests for Google File Search Store integration and sync operations
 */
import type { Document, FileSearchStore } from '@google/genai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  deleteDocumentFromFileSearchStore,
  deleteFileSearchStore,
  listDocuments,
  listFileSearchStores,
} from '@/lib/ai/rag';
import type { DocumentWithOrganization } from '@/lib/services/documents-service';
import {
  getDocumentCountsByStore,
  getDocumentsByFileSearchStore,
  getOrganizationsWithDocuments,
} from '@/lib/services/documents-service';
import {
  deleteAllDocuments,
  deleteDanglingDocuments,
  deleteStore,
  getStoreDocuments,
  listStores,
} from '@/lib/services/rag-service';

// Mock the dependencies
vi.mock('@/lib/ai/rag', () => ({
  listFileSearchStores: vi.fn(),
  listDocuments: vi.fn(),
  deleteFileSearchStore: vi.fn(),
  deleteDocumentFromFileSearchStore: vi.fn(),
}));

vi.mock('@/lib/services/documents-service', () => ({
  getOrganizationsWithDocuments: vi.fn(),
  getDocumentCountsByStore: vi.fn(),
  getDocumentsByFileSearchStore: vi.fn(),
}));

describe('RAG Service', () => {
  const mockOrgSlug = 'test-org';
  const mockStoreName = 'stores/test-store-123';
  const mockStoreDisplayName = `File Search Store - ${mockOrgSlug}`;

  const mockOrganizations = [
    {
      id: 'org-1',
      name: 'Test Organization',
      slug: mockOrgSlug,
    },
    {
      id: 'org-2',
      name: 'Another Org',
      slug: 'another-org',
    },
  ];

  const mockFileSearchStore: FileSearchStore = {
    name: mockStoreName,
    displayName: mockStoreDisplayName,
    activeDocumentsCount: '5',
    createTime: '2024-01-01T00:00:00Z',
    updateTime: '2024-01-02T00:00:00Z',
  };

  const mockFileSearchStore2: FileSearchStore = {
    name: 'stores/another-store-456',
    displayName: 'File Search Store - another-org',
    activeDocumentsCount: '3',
    createTime: '2024-01-01T00:00:00Z',
    updateTime: '2024-01-02T00:00:00Z',
  };

  const mockGoogleDocuments: Document[] = [
    {
      name: 'documents/doc-1-resource',
      displayName: 'Document 1.pdf',
      sizeBytes: '1024',
      createTime: '2024-01-01T00:00:00Z',
      updateTime: '2024-01-01T00:00:00Z',
    },
    {
      name: 'documents/doc-2-resource',
      displayName: 'Document 2.pdf',
      sizeBytes: '2048',
      createTime: '2024-01-02T00:00:00Z',
      updateTime: '2024-01-02T00:00:00Z',
    },
  ];

  const mockLocalDocuments: DocumentWithOrganization[] = [
    {
      id: 'doc-1',
      displayName: 'Document 1.pdf',
      documentResourceName: 'documents/doc-1-resource',
      sizeBytes: '1024',
      status: 'ready',
      createdAt: new Date('2024-01-01'),
      organizationName: 'Test Organization',
      organizationSlug: mockOrgSlug,
    },
    {
      id: 'doc-2',
      displayName: 'Document 2.pdf',
      documentResourceName: 'documents/doc-2-resource',
      sizeBytes: '2048',
      status: 'ready',
      createdAt: new Date('2024-01-02'),
      organizationName: 'Test Organization',
      organizationSlug: mockOrgSlug,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('listStores', () => {
    it('should return stores with sync status and organization info', async () => {
      // Mock async iterator for Google stores
      const mockStoreIterator = {
        async *[Symbol.asyncIterator]() {
          yield mockFileSearchStore;
          yield mockFileSearchStore2;
        },
      };

      vi.mocked(listFileSearchStores).mockResolvedValue(mockStoreIterator as never);
      vi.mocked(getOrganizationsWithDocuments).mockResolvedValue(mockOrganizations);
      vi.mocked(getDocumentCountsByStore).mockResolvedValue(
        new Map([
          [mockStoreName, 5],
          ['stores/another-store-456', 3],
        ])
      );

      const result = await listStores();

      expect(result.stores).toHaveLength(2);
      expect(result.stores[0]).toMatchObject({
        name: mockStoreName,
        displayName: mockStoreDisplayName,
        documentCount: 5,
        localCount: 5,
        syncStatus: 'synced',
        organization: {
          id: 'org-1',
          name: 'Test Organization',
          slug: mockOrgSlug,
        },
      });
    });

    it('should detect mismatch when document counts differ', async () => {
      const mockStoreIterator = {
        async *[Symbol.asyncIterator]() {
          yield mockFileSearchStore;
        },
      };

      vi.mocked(listFileSearchStores).mockResolvedValue(mockStoreIterator as never);
      vi.mocked(getOrganizationsWithDocuments).mockResolvedValue(mockOrganizations);
      vi.mocked(getDocumentCountsByStore).mockResolvedValue(
        new Map([[mockStoreName, 3]]) // Different from activeDocumentsCount: 5
      );

      const result = await listStores();

      expect(result.stores[0].syncStatus).toBe('mismatch');
      expect(result.stores[0].documentCount).toBe(5);
      expect(result.stores[0].localCount).toBe(3);
    });

    it('should filter out stores without matching organizations', async () => {
      const unmatchedStore: FileSearchStore = {
        name: 'stores/unmatched-store',
        displayName: 'File Search Store - unknown-org',
        activeDocumentsCount: '2',
        createTime: '2024-01-01T00:00:00Z',
        updateTime: '2024-01-02T00:00:00Z',
      };

      const mockStoreIterator = {
        async *[Symbol.asyncIterator]() {
          yield mockFileSearchStore;
          yield unmatchedStore;
        },
      };

      vi.mocked(listFileSearchStores).mockResolvedValue(mockStoreIterator as never);
      vi.mocked(getOrganizationsWithDocuments).mockResolvedValue(mockOrganizations);
      vi.mocked(getDocumentCountsByStore).mockResolvedValue(new Map([[mockStoreName, 5]]));

      const result = await listStores();

      expect(result.stores).toHaveLength(1);
      expect(result.stores[0].name).toBe(mockStoreName);
    });

    it('should handle stores with zero local documents', async () => {
      const mockStoreIterator = {
        async *[Symbol.asyncIterator]() {
          yield mockFileSearchStore;
        },
      };

      vi.mocked(listFileSearchStores).mockResolvedValue(mockStoreIterator as never);
      vi.mocked(getOrganizationsWithDocuments).mockResolvedValue(mockOrganizations);
      vi.mocked(getDocumentCountsByStore).mockResolvedValue(new Map()); // No local docs

      const result = await listStores();

      expect(result.stores[0].localCount).toBe(0);
      expect(result.stores[0].syncStatus).toBe('mismatch');
    });

    it('should handle empty store list', async () => {
      const mockStoreIterator = {
        async *[Symbol.asyncIterator]() {
          // Empty iterator
        },
      };

      vi.mocked(listFileSearchStores).mockResolvedValue(mockStoreIterator as never);
      vi.mocked(getOrganizationsWithDocuments).mockResolvedValue(mockOrganizations);
      vi.mocked(getDocumentCountsByStore).mockResolvedValue(new Map());

      const result = await listStores();

      expect(result.stores).toHaveLength(0);
    });

    it('should handle stores without names (filter them out)', async () => {
      const storeWithoutName: Partial<FileSearchStore> = {
        displayName: mockStoreDisplayName,
        activeDocumentsCount: '5',
      };

      const mockStoreIterator = {
        async *[Symbol.asyncIterator]() {
          yield storeWithoutName as FileSearchStore;
          yield mockFileSearchStore;
        },
      };

      vi.mocked(listFileSearchStores).mockResolvedValue(mockStoreIterator as never);
      vi.mocked(getOrganizationsWithDocuments).mockResolvedValue(mockOrganizations);
      vi.mocked(getDocumentCountsByStore).mockResolvedValue(new Map([[mockStoreName, 5]]));

      const result = await listStores();

      expect(result.stores).toHaveLength(1);
      expect(result.stores[0].name).toBe(mockStoreName);
    });

    it('should wrap Google API errors with context', async () => {
      vi.mocked(getOrganizationsWithDocuments).mockResolvedValue(mockOrganizations);
      vi.mocked(listFileSearchStores).mockRejectedValue(
        new Error('Google API rate limit exceeded')
      );

      await expect(listStores()).rejects.toThrow(
        'Failed to fetch File Search Stores from Google API'
      );
    });

    it('should handle stores with null organization match', async () => {
      const unmatchedStore: FileSearchStore = {
        name: 'stores/orphaned-store',
        displayName: 'File Search Store - orphaned',
        activeDocumentsCount: '1',
        createTime: '2024-01-01T00:00:00Z',
        updateTime: '2024-01-02T00:00:00Z',
      };

      const mockStoreIterator = {
        async *[Symbol.asyncIterator]() {
          yield unmatchedStore;
        },
      };

      vi.mocked(listFileSearchStores).mockResolvedValue(mockStoreIterator as never);
      vi.mocked(getOrganizationsWithDocuments).mockResolvedValue(mockOrganizations);
      vi.mocked(getDocumentCountsByStore).mockResolvedValue(
        new Map([['stores/orphaned-store', 1]])
      );

      const result = await listStores();

      // Should still be included but with null organization
      expect(result.stores).toHaveLength(0); // Filtered out because no matching org
    });
  });

  describe('getStoreDocuments', () => {
    it('should return documents with sync status', async () => {
      const mockDocIterator = {
        async *[Symbol.asyncIterator]() {
          yield mockGoogleDocuments[0];
          yield mockGoogleDocuments[1];
        },
      };

      vi.mocked(listDocuments).mockResolvedValue(mockDocIterator as never);
      vi.mocked(getDocumentsByFileSearchStore).mockResolvedValue(mockLocalDocuments);

      const result = await getStoreDocuments(mockStoreName);

      expect(result.documents).toHaveLength(2);
      expect(result.documents[0]).toMatchObject({
        id: 'doc-1',
        displayName: 'Document 1.pdf',
        syncStatus: 'synced',
        organizationName: 'Test Organization',
      });
    });

    it('should detect orphaned local documents (pending)', async () => {
      const localDocWithoutGoogle: DocumentWithOrganization = {
        id: 'doc-3',
        displayName: 'Pending Document.pdf',
        documentResourceName: null,
        sizeBytes: '512',
        status: 'in_progress',
        createdAt: new Date('2024-01-03'),
        organizationName: 'Test Organization',
        organizationSlug: mockOrgSlug,
      };

      const mockDocIterator = {
        async *[Symbol.asyncIterator]() {
          yield mockGoogleDocuments[0];
        },
      };

      vi.mocked(listDocuments).mockResolvedValue(mockDocIterator as never);
      vi.mocked(getDocumentsByFileSearchStore).mockResolvedValue([
        mockLocalDocuments[0],
        localDocWithoutGoogle,
      ]);

      const result = await getStoreDocuments(mockStoreName);

      const pendingDoc = result.documents.find((d) => d.id === 'doc-3');
      expect(pendingDoc?.syncStatus).toBe('pending');
    });

    it('should detect orphaned local documents (orphaned)', async () => {
      const localDocWithoutGoogle: DocumentWithOrganization = {
        id: 'doc-orphaned',
        displayName: 'Orphaned Document.pdf',
        documentResourceName: 'documents/missing-resource',
        sizeBytes: '512',
        status: 'ready',
        createdAt: new Date('2024-01-03'),
        organizationName: 'Test Organization',
        organizationSlug: mockOrgSlug,
      };

      const mockDocIterator = {
        async *[Symbol.asyncIterator]() {
          yield mockGoogleDocuments[0];
        },
      };

      vi.mocked(listDocuments).mockResolvedValue(mockDocIterator as never);
      vi.mocked(getDocumentsByFileSearchStore).mockResolvedValue([
        mockLocalDocuments[0],
        localDocWithoutGoogle,
      ]);

      const result = await getStoreDocuments(mockStoreName);

      const orphanedDoc = result.documents.find((d) => d.id === 'doc-orphaned');
      expect(orphanedDoc?.syncStatus).toBe('orphaned');
    });

    it('should detect orphaned documents (not in database)', async () => {
      const orphanedGoogleDoc: Document = {
        name: 'documents/orphaned-google-doc',
        displayName: 'Orphaned Google Document.pdf',
        sizeBytes: '4096',
        createTime: '2024-01-03T00:00:00Z',
        updateTime: '2024-01-03T00:00:00Z',
      };

      const mockDocIterator = {
        async *[Symbol.asyncIterator]() {
          yield mockGoogleDocuments[0];
          yield orphanedGoogleDoc;
        },
      };

      vi.mocked(listDocuments).mockResolvedValue(mockDocIterator as never);
      vi.mocked(getDocumentsByFileSearchStore).mockResolvedValue([mockLocalDocuments[0]]);

      const result = await getStoreDocuments(mockStoreName);

      const orphanedDoc = result.documents.find((d) => d.id === 'documents/orphaned-google-doc');
      expect(orphanedDoc).toBeDefined();
      expect(orphanedDoc?.syncStatus).toBe('orphaned');
      expect(orphanedDoc?.organizationName).toBeNull();
    });

    it('should handle empty document lists', async () => {
      const mockDocIterator = {
        async *[Symbol.asyncIterator]() {
          // Empty
        },
      };

      vi.mocked(listDocuments).mockResolvedValue(mockDocIterator as never);
      vi.mocked(getDocumentsByFileSearchStore).mockResolvedValue([]);

      const result = await getStoreDocuments(mockStoreName);

      expect(result.documents).toHaveLength(0);
    });

    it('should handle documents without names in Google API', async () => {
      const docWithoutName: Partial<Document> = {
        displayName: 'Document Without Name.pdf',
        sizeBytes: '1024',
      };

      const mockDocIterator = {
        async *[Symbol.asyncIterator]() {
          yield docWithoutName as Document;
          yield mockGoogleDocuments[0];
        },
      };

      vi.mocked(listDocuments).mockResolvedValue(mockDocIterator as never);
      vi.mocked(getDocumentsByFileSearchStore).mockResolvedValue([mockLocalDocuments[0]]);

      const result = await getStoreDocuments(mockStoreName);

      // Should filter out documents without names
      expect(result.documents).toHaveLength(1);
    });

    it('should wrap Google API errors with context', async () => {
      const googleError = new Error('Google API authentication failed');
      vi.mocked(listDocuments).mockRejectedValue(googleError);

      await expect(getStoreDocuments(mockStoreName)).rejects.toThrow(
        `Failed to fetch documents from Google API store: ${mockStoreName}`
      );
    });

    it('should propagate database errors naturally', async () => {
      const mockDocIterator = {
        async *[Symbol.asyncIterator]() {
          yield mockGoogleDocuments[0];
        },
      };

      vi.mocked(listDocuments).mockResolvedValue(mockDocIterator as never);
      const dbError = new Error('Database query timeout');
      vi.mocked(getDocumentsByFileSearchStore).mockRejectedValue(dbError);

      await expect(getStoreDocuments(mockStoreName)).rejects.toThrow('Database query timeout');
    });

    it('should include metadata for synced documents', async () => {
      const mockDocIterator = {
        async *[Symbol.asyncIterator]() {
          yield mockGoogleDocuments[0];
        },
      };

      vi.mocked(listDocuments).mockResolvedValue(mockDocIterator as never);
      vi.mocked(getDocumentsByFileSearchStore).mockResolvedValue([mockLocalDocuments[0]]);

      const result = await getStoreDocuments(mockStoreName);

      expect(result.documents[0].metadata).toBeDefined();
      expect(result.documents[0].metadata?.name).toBe('documents/doc-1-resource');
    });

    it('should handle mixed sync statuses correctly', async () => {
      const localDocs: DocumentWithOrganization[] = [
        mockLocalDocuments[0], // synced
        {
          ...mockLocalDocuments[1],
          documentResourceName: null,
          status: 'in_progress',
        }, // pending
        {
          id: 'doc-orphaned',
          displayName: 'Orphaned.pdf',
          documentResourceName: 'documents/missing',
          sizeBytes: '512',
          status: 'ready',
          createdAt: new Date(),
          organizationName: 'Test Organization',
          organizationSlug: mockOrgSlug,
        }, // orphaned
      ];

      const mockDocIterator = {
        async *[Symbol.asyncIterator]() {
          yield mockGoogleDocuments[0];
        },
      };

      vi.mocked(listDocuments).mockResolvedValue(mockDocIterator as never);
      vi.mocked(getDocumentsByFileSearchStore).mockResolvedValue(localDocs);

      const result = await getStoreDocuments(mockStoreName);

      const syncStatuses = result.documents.map((d) => d.syncStatus);
      expect(syncStatuses).toContain('synced');
      expect(syncStatuses).toContain('pending');
      expect(syncStatuses).toContain('orphaned');
    });
  });

  describe('deleteStore', () => {
    it('should successfully delete a store', async () => {
      vi.mocked(deleteFileSearchStore).mockResolvedValue(undefined as never);

      const result = await deleteStore(mockStoreName);

      expect(result).toEqual({
        success: true,
        message: 'File Search Store deleted successfully',
      });
      expect(deleteFileSearchStore).toHaveBeenCalledWith({ name: mockStoreName });
    });

    it('should propagate Google API errors', async () => {
      const googleError = new Error('Store not found');
      vi.mocked(deleteFileSearchStore).mockRejectedValue(googleError);

      await expect(deleteStore(mockStoreName)).rejects.toThrow('Store not found');
    });

    it('should handle deletion of non-existent store', async () => {
      const notFoundError = new Error('Resource not found');
      vi.mocked(deleteFileSearchStore).mockRejectedValue(notFoundError);

      await expect(deleteStore('stores/non-existent')).rejects.toThrow('Resource not found');
    });

    it('should handle Google API rate limiting', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      vi.mocked(deleteFileSearchStore).mockRejectedValue(rateLimitError);

      await expect(deleteStore(mockStoreName)).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('deleteAllDocuments', () => {
    it('should successfully delete all documents from a store', async () => {
      const mockDocIterator = {
        async *[Symbol.asyncIterator]() {
          yield mockGoogleDocuments[0];
          yield mockGoogleDocuments[1];
        },
      };

      vi.mocked(listDocuments).mockResolvedValue(mockDocIterator as never);
      vi.mocked(deleteDocumentFromFileSearchStore).mockResolvedValue(undefined as never);

      const result = await deleteAllDocuments(mockStoreName);

      expect(result).toEqual({
        success: true,
        message: 'Deleted 2 document(s)',
        deletedCount: 2,
      });
      expect(deleteDocumentFromFileSearchStore).toHaveBeenCalledTimes(2);
      expect(deleteDocumentFromFileSearchStore).toHaveBeenCalledWith({
        name: 'documents/doc-1-resource',
      });
      expect(deleteDocumentFromFileSearchStore).toHaveBeenCalledWith({
        name: 'documents/doc-2-resource',
      });
    });

    it('should handle empty store (no documents)', async () => {
      const mockDocIterator = {
        async *[Symbol.asyncIterator]() {
          // Empty
        },
      };

      vi.mocked(listDocuments).mockResolvedValue(mockDocIterator as never);

      const result = await deleteAllDocuments(mockStoreName);

      expect(result).toEqual({
        success: true,
        message: 'Deleted 0 document(s)',
        deletedCount: 0,
      });
      expect(deleteDocumentFromFileSearchStore).not.toHaveBeenCalled();
    });

    it('should handle partial failures and continue deleting', async () => {
      const mockDocIterator = {
        async *[Symbol.asyncIterator]() {
          yield mockGoogleDocuments[0];
          yield mockGoogleDocuments[1];
        },
      };

      vi.mocked(listDocuments).mockResolvedValue(mockDocIterator as never);
      vi.mocked(deleteDocumentFromFileSearchStore)
        .mockResolvedValueOnce(undefined as never) // First succeeds
        .mockRejectedValueOnce(new Error('Document locked')); // Second fails

      const result = await deleteAllDocuments(mockStoreName);

      expect(result).toEqual({
        success: true,
        message: 'Deleted 1 document(s) (1 failed)',
        deletedCount: 1,
      });
      expect(deleteDocumentFromFileSearchStore).toHaveBeenCalledTimes(2);
    });

    it('should throw error when all deletions fail', async () => {
      const mockDocIterator = {
        async *[Symbol.asyncIterator]() {
          yield mockGoogleDocuments[0];
        },
      };

      vi.mocked(listDocuments).mockResolvedValue(mockDocIterator as never);
      vi.mocked(deleteDocumentFromFileSearchStore).mockRejectedValue(
        new Error('Permission denied')
      );

      await expect(deleteAllDocuments(mockStoreName)).rejects.toThrow('Failed to delete documents');
    });

    it('should skip documents without names', async () => {
      const docWithoutName: Partial<Document> = {
        displayName: 'Document Without Name.pdf',
        sizeBytes: '1024',
      };

      const mockDocIterator = {
        async *[Symbol.asyncIterator]() {
          yield docWithoutName as Document;
          yield mockGoogleDocuments[0];
        },
      };

      vi.mocked(listDocuments).mockResolvedValue(mockDocIterator as never);
      vi.mocked(deleteDocumentFromFileSearchStore).mockResolvedValue(undefined as never);

      const result = await deleteAllDocuments(mockStoreName);

      expect(result.deletedCount).toBe(1);
      expect(deleteDocumentFromFileSearchStore).toHaveBeenCalledTimes(1);
    });

    it('should wrap Google API errors with context', async () => {
      const googleError = new Error('API authentication failed');
      vi.mocked(listDocuments).mockRejectedValue(googleError);

      await expect(deleteAllDocuments(mockStoreName)).rejects.toThrow(
        `Failed to fetch documents from Google API store: ${mockStoreName}`
      );
    });
  });

  describe('deleteDanglingDocuments', () => {
    it('should delete only dangling documents', async () => {
      const danglingDoc: Document = {
        name: 'documents/dangling-doc',
        displayName: 'Dangling Document.pdf',
        sizeBytes: '2048',
        createTime: '2024-01-03T00:00:00Z',
        updateTime: '2024-01-03T00:00:00Z',
      };

      const mockDocIterator = {
        async *[Symbol.asyncIterator]() {
          yield mockGoogleDocuments[0]; // This one is in DB
          yield danglingDoc; // This one is NOT in DB
        },
      };

      vi.mocked(listDocuments).mockResolvedValue(mockDocIterator as never);
      vi.mocked(getDocumentsByFileSearchStore).mockResolvedValue([mockLocalDocuments[0]]);
      vi.mocked(deleteDocumentFromFileSearchStore).mockResolvedValue(undefined as never);

      const result = await deleteDanglingDocuments(mockStoreName);

      expect(result).toEqual({
        success: true,
        message: 'Deleted 1 dangling document(s)',
        deletedCount: 1,
      });
      expect(deleteDocumentFromFileSearchStore).toHaveBeenCalledTimes(1);
      expect(deleteDocumentFromFileSearchStore).toHaveBeenCalledWith({
        name: 'documents/dangling-doc',
      });
    });

    it('should not delete documents that exist in database', async () => {
      const mockDocIterator = {
        async *[Symbol.asyncIterator]() {
          yield mockGoogleDocuments[0];
          yield mockGoogleDocuments[1];
        },
      };

      vi.mocked(listDocuments).mockResolvedValue(mockDocIterator as never);
      vi.mocked(getDocumentsByFileSearchStore).mockResolvedValue(mockLocalDocuments);
      vi.mocked(deleteDocumentFromFileSearchStore).mockResolvedValue(undefined as never);

      const result = await deleteDanglingDocuments(mockStoreName);

      expect(result).toEqual({
        success: true,
        message: 'Deleted 0 dangling document(s)',
        deletedCount: 0,
      });
      expect(deleteDocumentFromFileSearchStore).not.toHaveBeenCalled();
    });

    it('should handle multiple dangling documents', async () => {
      const danglingDocs: Document[] = [
        {
          name: 'documents/dangling-1',
          displayName: 'Dangling 1.pdf',
          sizeBytes: '1024',
          createTime: '2024-01-03T00:00:00Z',
          updateTime: '2024-01-03T00:00:00Z',
        },
        {
          name: 'documents/dangling-2',
          displayName: 'Dangling 2.pdf',
          sizeBytes: '2048',
          createTime: '2024-01-04T00:00:00Z',
          updateTime: '2024-01-04T00:00:00Z',
        },
      ];

      const mockDocIterator = {
        async *[Symbol.asyncIterator]() {
          yield mockGoogleDocuments[0]; // In DB
          yield danglingDocs[0]; // Not in DB
          yield danglingDocs[1]; // Not in DB
        },
      };

      vi.mocked(listDocuments).mockResolvedValue(mockDocIterator as never);
      vi.mocked(getDocumentsByFileSearchStore).mockResolvedValue([mockLocalDocuments[0]]);
      vi.mocked(deleteDocumentFromFileSearchStore).mockResolvedValue(undefined as never);

      const result = await deleteDanglingDocuments(mockStoreName);

      expect(result.deletedCount).toBe(2);
      expect(deleteDocumentFromFileSearchStore).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures when deleting dangling documents', async () => {
      const danglingDocs: Document[] = [
        {
          name: 'documents/dangling-1',
          displayName: 'Dangling 1.pdf',
          sizeBytes: '1024',
          createTime: '2024-01-03T00:00:00Z',
          updateTime: '2024-01-03T00:00:00Z',
        },
        {
          name: 'documents/dangling-2',
          displayName: 'Dangling 2.pdf',
          sizeBytes: '2048',
          createTime: '2024-01-04T00:00:00Z',
          updateTime: '2024-01-04T00:00:00Z',
        },
      ];

      const mockDocIterator = {
        async *[Symbol.asyncIterator]() {
          yield danglingDocs[0];
          yield danglingDocs[1];
        },
      };

      vi.mocked(listDocuments).mockResolvedValue(mockDocIterator as never);
      vi.mocked(getDocumentsByFileSearchStore).mockResolvedValue([]);
      vi.mocked(deleteDocumentFromFileSearchStore)
        .mockResolvedValueOnce(undefined as never)
        .mockRejectedValueOnce(new Error('Document in use'));

      const result = await deleteDanglingDocuments(mockStoreName);

      expect(result).toEqual({
        success: true,
        message: 'Deleted 1 dangling document(s) (1 failed)',
        deletedCount: 1,
      });
    });

    it('should throw error when all dangling document deletions fail', async () => {
      const danglingDoc: Document = {
        name: 'documents/dangling-doc',
        displayName: 'Dangling Document.pdf',
        sizeBytes: '2048',
        createTime: '2024-01-03T00:00:00Z',
        updateTime: '2024-01-03T00:00:00Z',
      };

      const mockDocIterator = {
        async *[Symbol.asyncIterator]() {
          yield danglingDoc;
        },
      };

      vi.mocked(listDocuments).mockResolvedValue(mockDocIterator as never);
      vi.mocked(getDocumentsByFileSearchStore).mockResolvedValue([]);
      vi.mocked(deleteDocumentFromFileSearchStore).mockRejectedValue(
        new Error('Permission denied')
      );

      await expect(deleteDanglingDocuments(mockStoreName)).rejects.toThrow(
        'Failed to delete dangling documents'
      );
    });

    it('should handle documents with null documentResourceName in DB', async () => {
      const localDocWithNullResource: DocumentWithOrganization = {
        id: 'doc-pending',
        displayName: 'Pending Document.pdf',
        documentResourceName: null,
        sizeBytes: '512',
        status: 'in_progress',
        createdAt: new Date('2024-01-03'),
        organizationName: 'Test Organization',
        organizationSlug: mockOrgSlug,
      };

      const danglingDoc: Document = {
        name: 'documents/dangling-doc',
        displayName: 'Dangling Document.pdf',
        sizeBytes: '2048',
        createTime: '2024-01-03T00:00:00Z',
        updateTime: '2024-01-03T00:00:00Z',
      };

      const mockDocIterator = {
        async *[Symbol.asyncIterator]() {
          yield danglingDoc;
        },
      };

      vi.mocked(listDocuments).mockResolvedValue(mockDocIterator as never);
      vi.mocked(getDocumentsByFileSearchStore).mockResolvedValue([localDocWithNullResource]);
      vi.mocked(deleteDocumentFromFileSearchStore).mockResolvedValue(undefined as never);

      const result = await deleteDanglingDocuments(mockStoreName);

      expect(result.deletedCount).toBe(1);
      expect(deleteDocumentFromFileSearchStore).toHaveBeenCalledWith({
        name: 'documents/dangling-doc',
      });
    });

    it('should skip dangling documents without names', async () => {
      const docWithoutName: Partial<Document> = {
        displayName: 'Document Without Name.pdf',
        sizeBytes: '1024',
      };

      const danglingDoc: Document = {
        name: 'documents/dangling-doc',
        displayName: 'Dangling Document.pdf',
        sizeBytes: '2048',
        createTime: '2024-01-03T00:00:00Z',
        updateTime: '2024-01-03T00:00:00Z',
      };

      const mockDocIterator = {
        async *[Symbol.asyncIterator]() {
          yield docWithoutName as Document;
          yield danglingDoc;
        },
      };

      vi.mocked(listDocuments).mockResolvedValue(mockDocIterator as never);
      vi.mocked(getDocumentsByFileSearchStore).mockResolvedValue([]);
      vi.mocked(deleteDocumentFromFileSearchStore).mockResolvedValue(undefined as never);

      const result = await deleteDanglingDocuments(mockStoreName);

      expect(result.deletedCount).toBe(1);
      expect(deleteDocumentFromFileSearchStore).toHaveBeenCalledTimes(1);
    });

    it('should propagate database errors', async () => {
      const mockDocIterator = {
        async *[Symbol.asyncIterator]() {
          yield mockGoogleDocuments[0];
        },
      };

      vi.mocked(listDocuments).mockResolvedValue(mockDocIterator as never);
      const dbError = new Error('Database connection lost');
      vi.mocked(getDocumentsByFileSearchStore).mockRejectedValue(dbError);

      await expect(deleteDanglingDocuments(mockStoreName)).rejects.toThrow(
        'Database connection lost'
      );
    });
  });
});
