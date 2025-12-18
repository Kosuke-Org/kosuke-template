import { describe, expect, it } from 'vitest';

import { extractRelevantSources } from '@/lib/ai/utils';

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
});
