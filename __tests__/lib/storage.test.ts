import { mkdir, unlink, writeFile } from 'fs/promises';
import path from 'path';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getKeyFromPathname, isS3Url } from '@/lib/storage';

vi.mock('fs/promises');
vi.mock('@aws-sdk/client-s3');
vi.mock('@aws-sdk/s3-request-presigner');

describe('Storage', () => {
  let storage: typeof import('@/lib/storage');
  const mockSend = vi.fn().mockResolvedValue({});

  vi.mocked(S3Client).mockImplementation(
    () =>
      ({
        send: mockSend,
      }) as unknown as S3Client
  );

  // Helper to create a mock File with working arrayBuffer()
  function createMockFile(content: string, filename: string, options: FilePropertyBag = {}) {
    const blob = new Blob([content], { type: options.type });
    const file = new File([blob], filename, options);

    // Ensure arrayBuffer() is available and working
    if (!file.arrayBuffer) {
      Object.defineProperty(file, 'arrayBuffer', {
        value: async () => {
          const buffer = new ArrayBuffer(content.length);
          const view = new Uint8Array(buffer);
          for (let i = 0; i < content.length; i++) {
            view[i] = content.charCodeAt(i);
          }
          return buffer;
        },
      });
    }

    return file;
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // Dynamically import storage module to get fresh instance (resets singleton)
    storage = await import('@/lib/storage');
  });

  describe('getPresignedDownloadUrl', () => {
    it('should generate presigned URL for S3 in production', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('S3_BUCKET', 'test-bucket');
      vi.stubEnv('S3_ACCESS_KEY_ID', 'test-key');
      vi.stubEnv('S3_SECRET_ACCESS_KEY', 'test-secret');
      vi.stubEnv('S3_REGION', 'us-east-1');

      const mockUrl = 'https://s3.amazonaws.com/test-bucket/file.pdf?signed=true';
      vi.mocked(getSignedUrl).mockResolvedValue(mockUrl);

      const url = await storage.getPresignedDownloadUrl('documents/org-1/file.pdf', 300);
      expect(url).toBe(mockUrl);
      expect(getSignedUrl).toHaveBeenCalledWith(expect.any(Object), expect.any(GetObjectCommand), {
        expiresIn: 300,
      });
    });

    it('should return local API route in development', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');

      const url = await storage.getPresignedDownloadUrl('documents/org-1/file.pdf');

      expect(url).toBe('http://localhost:3000/api/uploads/documents/org-1/file.pdf');
      expect(getSignedUrl).not.toHaveBeenCalled();
    });

    it('should use default expiration time', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('S3_BUCKET', 'test-bucket');
      vi.stubEnv('S3_ACCESS_KEY_ID', 'test-key');
      vi.stubEnv('S3_SECRET_ACCESS_KEY', 'test-secret');

      vi.mocked(getSignedUrl).mockResolvedValue('https://example.com/signed');

      await storage.getPresignedDownloadUrl('file.jpg');

      expect(getSignedUrl).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), {
        expiresIn: 300,
      });
    });
  });

  describe('uploadDocument', () => {
    it('should upload document to S3 in production', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('S3_BUCKET', 'test-bucket');
      vi.stubEnv('S3_ACCESS_KEY_ID', 'test-key');
      vi.stubEnv('S3_SECRET_ACCESS_KEY', 'test-secret');
      vi.stubEnv('S3_ENDPOINT', 'https://s3.example.com');

      const mockFile = createMockFile('test content', 'document.pdf', { type: 'application/pdf' });

      const key = await storage.uploadDocument(mockFile, 'org-123');
      expect(key).toMatch(/^documents\/org-123\/\d+-document\.pdf$/);
      expect(mockSend).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    });

    it('should upload document to local storage in development', async () => {
      vi.stubEnv('NODE_ENV', 'development');

      const mockFile = createMockFile('test content', 'report.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      const key = await storage.uploadDocument(mockFile, 'org-456');
      expect(key).toMatch(/^documents\/org-456\/\d+-report\.docx$/);
      expect(mkdir).toHaveBeenCalled();
      expect(writeFile).toHaveBeenCalledWith(expect.any(String), expect.any(Buffer));
    });

    it('should sanitize filename with special characters', async () => {
      vi.stubEnv('NODE_ENV', 'development');

      const mockFile = createMockFile('test content', 'my document (v2) #final!.pdf', {
        type: 'application/pdf',
      });

      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      const key = await storage.uploadDocument(mockFile, 'org-789');
      expect(key).toMatch('documents/org-789');
      expect(key).toMatch(/my_document__v2___final_\.pdf$/);
      expect(key).not.toMatch(/[()#!\s]/); // No special characters
    });

    it('should throw error on upload failure', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('S3_BUCKET', 'test-bucket');
      vi.stubEnv('S3_ACCESS_KEY_ID', 'test-key');
      vi.stubEnv('S3_SECRET_ACCESS_KEY', 'test-secret');
      vi.stubEnv('S3_ENDPOINT', 'https://s3.example.com');

      const mockFile = createMockFile('test content', 'document.pdf', { type: 'application/pdf' });

      mockSend.mockRejectedValueOnce(new Error('Upload failed'));

      await expect(storage.uploadDocument(mockFile, 'org-123')).rejects.toThrow(
        'Failed to upload document'
      );
    });
  });

  describe('deleteDocument', () => {
    it('should delete document from S3 in production', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('S3_BUCKET', 'test-bucket');
      vi.stubEnv('S3_ACCESS_KEY_ID', 'test-key');
      vi.stubEnv('S3_SECRET_ACCESS_KEY', 'test-secret');
      vi.stubEnv('S3_ENDPOINT', 'https://s3.example.com');

      const documentUrl =
        'https://s3.example.com/test-bucket/documents/org-123/1234567890-file.pdf';
      await storage.deleteDocument(documentUrl);

      expect(mockSend).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
    });

    it('should delete document from local storage in development', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.mocked(unlink).mockResolvedValue(undefined);

      const documentUrl = 'http://localhost:3000/uploads/documents/org-123/1234567890-file.pdf';
      await storage.deleteDocument(documentUrl);

      expect(unlink).toHaveBeenCalledWith(
        expect.stringContaining(path.join('uploads', 'documents', 'org-123', '1234567890-file.pdf'))
      );
    });

    it('should handle AWS S3 document URLs', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('S3_BUCKET', 'test-bucket');
      vi.stubEnv('S3_ACCESS_KEY_ID', 'test-key');
      vi.stubEnv('S3_SECRET_ACCESS_KEY', 'test-secret');

      const documentUrl =
        'https://test-bucket.s3.amazonaws.com/documents/org-123/1234567890-file.pdf';

      await storage.deleteDocument(documentUrl);

      expect(mockSend).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
    });
  });

  describe('getKeyFromPathname', () => {
    it('should extract S3 key from URL pathname', () => {
      const key = getKeyFromPathname('/documents/org-123/1234567890-file.pdf');
      expect(key).toBe('documents/org-123/1234567890-file.pdf');
    });

    it('should extract S3 key from URL pathname with bucket prefix', () => {
      vi.stubEnv('S3_BUCKET', 'test-bucket');
      vi.stubEnv('S3_ENDPOINT', 'https://s3.example.com');
      const key = getKeyFromPathname('/test-bucket/documents/org-123/1234567890-file.pdf');
      expect(key).toBe('documents/org-123/1234567890-file.pdf');
    });
  });

  describe('isS3Url', () => {
    it('should return true if the URL is an S3 URL', () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('S3_BUCKET', 'test-bucket');
      vi.stubEnv('S3_ENDPOINT', 'https://s3.example.com');
      const url = 'https://s3.example.com/test-bucket/documents/org-123/1234567890-file.pdf';
      expect(isS3Url(url)).toBe(true);
    });
  });

  it('should return false if the URL is not an S3 URL', () => {
    const url = 'https://example.com/documents/org-123/1234567890-file.pdf';
    expect(isS3Url(url)).toBe(false);
  });
});
