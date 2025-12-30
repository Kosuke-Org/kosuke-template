/**
 * Documents Service Tests
 * Tests for document-related database operations
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/lib/db/drizzle';
import {
  getDocumentCountsByStore,
  getDocumentsByFileSearchStore,
  getOrganizationsWithDocuments,
} from '@/lib/services/documents-service';

// Mock the database
vi.mock('@/lib/db/drizzle', () => ({
  db: {
    select: vi.fn(),
    selectDistinct: vi.fn(),
  },
}));

describe('Documents Service', () => {
  const mockFileSearchStoreName = 'stores/test-store-123';
  const mockOrgSlug = 'test-org';

  const mockDocuments = [
    {
      id: 'doc-1',
      displayName: 'Document 1.pdf',
      documentResourceName: 'documents/doc-1-resource',
      sizeBytes: '1024',
      status: 'ready' as const,
      createdAt: new Date('2024-01-01'),
      organizationName: 'Test Organization',
      organizationSlug: mockOrgSlug,
    },
    {
      id: 'doc-2',
      displayName: 'Document 2.pdf',
      documentResourceName: 'documents/doc-2-resource',
      sizeBytes: '2048',
      status: 'in_progress' as const,
      createdAt: new Date('2024-01-02'),
      organizationName: 'Test Organization',
      organizationSlug: mockOrgSlug,
    },
    {
      id: 'doc-3',
      displayName: 'Document 3.pdf',
      documentResourceName: null,
      sizeBytes: '512',
      status: 'error' as const,
      createdAt: new Date('2024-01-03'),
      organizationName: 'Test Organization',
      organizationSlug: mockOrgSlug,
    },
  ];

  const mockOrganizations = [
    {
      id: 'org-1',
      name: 'Organization 1',
      slug: 'org-1-slug',
    },
    {
      id: 'org-2',
      name: 'Organization 2',
      slug: 'org-2-slug',
    },
  ];

  const mockDocumentCounts = [
    {
      fileSearchStoreName: 'stores/store-1',
      count: 5,
    },
    {
      fileSearchStoreName: 'stores/store-2',
      count: 3,
    },
    {
      fileSearchStoreName: 'stores/store-3',
      count: 10,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getDocumentsByFileSearchStore', () => {
    it('should return documents for a specific file search store', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockDocuments),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await getDocumentsByFileSearchStore(mockFileSearchStoreName);

      expect(result).toEqual(mockDocuments);
      expect(db.select).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no documents exist for the store', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await getDocumentsByFileSearchStore(mockFileSearchStoreName);

      expect(result).toEqual([]);
      expect(db.select).toHaveBeenCalledTimes(1);
    });

    it('should include organization information in the results', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockDocuments),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await getDocumentsByFileSearchStore(mockFileSearchStoreName);

      expect(result[0]).toHaveProperty('organizationName');
      expect(result[0]).toHaveProperty('organizationSlug');
      expect(result[0].organizationName).toBe('Test Organization');
      expect(result[0].organizationSlug).toBe(mockOrgSlug);
    });

    it('should handle documents with null documentResourceName', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockDocuments[2]]),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await getDocumentsByFileSearchStore(mockFileSearchStoreName);

      expect(result[0].documentResourceName).toBeNull();
    });

    it('should handle different document statuses', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockDocuments),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await getDocumentsByFileSearchStore(mockFileSearchStoreName);

      expect(result[0].status).toBe('ready');
      expect(result[1].status).toBe('in_progress');
      expect(result[2].status).toBe('error');
    });

    it('should propagate database errors', async () => {
      const dbError = new Error('Database connection failed');
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockRejectedValue(dbError),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      await expect(getDocumentsByFileSearchStore(mockFileSearchStoreName)).rejects.toThrow(
        'Database connection failed'
      );
    });
  });

  describe('getOrganizationsWithDocuments', () => {
    it('should return organizations that have documents with file search stores', async () => {
      const mockSelectDistinct = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockOrganizations),
          }),
        }),
      });

      vi.mocked(db.selectDistinct).mockImplementation(mockSelectDistinct);

      const result = await getOrganizationsWithDocuments();

      expect(result).toEqual(mockOrganizations);
      expect(db.selectDistinct).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no organizations have documents', async () => {
      const mockSelectDistinct = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      vi.mocked(db.selectDistinct).mockImplementation(mockSelectDistinct);

      const result = await getOrganizationsWithDocuments();

      expect(result).toEqual([]);
      expect(db.selectDistinct).toHaveBeenCalledTimes(1);
    });

    it('should return distinct organizations only', async () => {
      const mockSelectDistinct = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockOrganizations),
          }),
        }),
      });

      vi.mocked(db.selectDistinct).mockImplementation(mockSelectDistinct);

      const result = await getOrganizationsWithDocuments();

      // Verify that selectDistinct was used (not select)
      expect(db.selectDistinct).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
    });

    it('should include organization id, name, and slug', async () => {
      const mockSelectDistinct = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockOrganizations),
          }),
        }),
      });

      vi.mocked(db.selectDistinct).mockImplementation(mockSelectDistinct);

      const result = await getOrganizationsWithDocuments();

      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('slug');
    });

    it('should propagate database errors', async () => {
      const dbError = new Error('Database query failed');
      const mockSelectDistinct = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockRejectedValue(dbError),
          }),
        }),
      });

      vi.mocked(db.selectDistinct).mockImplementation(mockSelectDistinct);

      await expect(getOrganizationsWithDocuments()).rejects.toThrow('Database query failed');
    });
  });

  describe('getDocumentCountsByStore', () => {
    it('should return a map of document counts by store name', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValue(mockDocumentCounts),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await getDocumentCountsByStore();

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(3);
      expect(result.get('stores/store-1')).toBe(5);
      expect(result.get('stores/store-2')).toBe(3);
      expect(result.get('stores/store-3')).toBe(10);
    });

    it('should return empty map when no documents exist', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await getDocumentCountsByStore();

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it('should handle single store with documents', async () => {
      const singleStore = [
        {
          fileSearchStoreName: 'stores/single-store',
          count: 15,
        },
      ];

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValue(singleStore),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await getDocumentCountsByStore();

      expect(result.size).toBe(1);
      expect(result.get('stores/single-store')).toBe(15);
    });

    it('should handle stores with zero documents', async () => {
      const storesWithZero = [
        {
          fileSearchStoreName: 'stores/empty-store',
          count: 0,
        },
      ];

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValue(storesWithZero),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await getDocumentCountsByStore();

      expect(result.get('stores/empty-store')).toBe(0);
    });

    it('should propagate database errors', async () => {
      const dbError = new Error('Aggregation failed');
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockRejectedValue(dbError),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      await expect(getDocumentCountsByStore()).rejects.toThrow('Aggregation failed');
    });

    it('should correctly map store names to counts', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockResolvedValue(mockDocumentCounts),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await getDocumentCountsByStore();

      // Verify all stores are in the map
      mockDocumentCounts.forEach((item) => {
        expect(result.has(item.fileSearchStoreName)).toBe(true);
        expect(result.get(item.fileSearchStoreName)).toBe(item.count);
      });
    });
  });
});
