import { describe, expect, it } from 'vitest';

import { extractDocumentIdFromFilename, extractRelevantSources } from '@/lib/ai/utils';

describe('ai/utils', () => {
  describe('extractRelevantSources', () => {
    it('should extract empty array if no grounding chunks are present', () => {
      const groundingMetadata = {
        groundingChunks: [],
      };
      const result = extractRelevantSources(groundingMetadata);
      expect(result).toEqual([]);
    });

    it('should extract relevant sources from grounding metadata', () => {
      const groundingMetadata = {
        groundingChunks: [
          {
            retrievedContext: {
              title: 'AIAct.pdf',
              text: '--- PAGE 1 ---\n\nThe AI Act is a European Union regulation that aims to protect the rights of individuals and businesses in the use of artificial intelligence.\n',
              fileSearchStore: 'fileSearchStores/janesmithcodocuments-5rny6heg3bsn',
            },
          },
          {
            retrievedContext: {
              title: 'GDPR.txt',
              text: 'The General Data Protection Regulation (GDPR) is a European Union regulation that aims to protect the rights of individuals and businesses in the use of personal data.',
              fileSearchStore: 'fileSearchStores/janesmithcodocuments-5rny6heg3bsn',
            },
          },
        ],
        groundingSupports: [
          {
            segment: {
              endIndex: 111,
              text: 'The AI Act is a European Union regulation that aims to protect the rights of individuals and businesses in the use of artificial intelligence.',
            },
            groundingChunkIndices: [0],
          },
          {
            segment: {
              startIndex: 112,
              endIndex: 189,
              text: 'The General Data Protection Regulation (GDPR) is a European Union regulation that aims to protect the rights of individuals and businesses in the use of personal data.',
            },
            groundingChunkIndices: [1],
          },
        ],
      };
      const result = extractRelevantSources(groundingMetadata);
      expect(result).toEqual([
        {
          fileSearchStoreName: 'fileSearchStores/janesmithcodocuments-5rny6heg3bsn',
          title: 'AIAct.pdf',
        },
        {
          fileSearchStoreName: 'fileSearchStores/janesmithcodocuments-5rny6heg3bsn',
          title: 'GDPR.txt',
        },
      ]);
    });
  });

  describe('extractDocumentIdFromFilename', () => {
    it('should extract UUID document ID from filename', () => {
      expect(
        extractDocumentIdFromFilename('550e8400-e29b-41d4-a716-446655440000-document.pdf')
      ).toBe('550e8400-e29b-41d4-a716-446655440000');

      expect(extractDocumentIdFromFilename('643692fb-45a0-430f-868f-0ad6b8392fe5-GDPR.txt')).toBe(
        '643692fb-45a0-430f-868f-0ad6b8392fe5'
      );

      expect(
        extractDocumentIdFromFilename('a1b2c3d4-e5f6-7890-abcd-ef1234567890-invoice-2024.xlsx')
      ).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
    });

    it('should handle filenames with multiple dashes in the original name', () => {
      expect(
        extractDocumentIdFromFilename('123e4567-e89b-12d3-a456-426614174000-my-file-name-2024.pdf')
      ).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should return null for filenames without UUID format', () => {
      expect(extractDocumentIdFromFilename('report.pdf')).toBeNull();
      expect(extractDocumentIdFromFilename('abc123-report.pdf')).toBeNull();
      expect(extractDocumentIdFromFilename('no-dash-at-start')).toBeNull();
      expect(extractDocumentIdFromFilename('')).toBeNull();
      expect(extractDocumentIdFromFilename('doc-123-my-file-name.pdf')).toBeNull();
    });

    it('should be case-insensitive for UUID matching', () => {
      expect(
        extractDocumentIdFromFilename('550E8400-E29B-41D4-A716-446655440000-document.pdf')
      ).toBe('550E8400-E29B-41D4-A716-446655440000');
    });
  });
});
