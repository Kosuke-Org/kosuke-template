import {
  uploadProfileImage,
  deleteProfileImage,
  validateImageFile,
  generateStoragePath,
  getImageMetadata,
} from '@/lib/storage';

// Mock Vercel Blob
jest.mock('@vercel/blob', () => ({
  put: jest.fn(),
  del: jest.fn(),
}));

describe('Storage Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateImageFile', () => {
    it('should validate image file types', () => {
      const validFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const invalidFile = new File([''], 'test.txt', { type: 'text/plain' });

      expect(validateImageFile(validFile)).toBe(true);
      expect(validateImageFile(invalidFile)).toBe(false);
    });

    it('should validate file size limits', () => {
      // Create a mock file with size
      const smallFile = new File(['x'.repeat(1024)], 'small.jpg', { type: 'image/jpeg' });
      const largeFile = new File(['x'.repeat(10 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
      });

      expect(validateImageFile(smallFile)).toBe(true);
      expect(validateImageFile(largeFile)).toBe(false);
    });

    it('should handle MIME type validation', () => {
      const jpegFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const pngFile = new File([''], 'test.png', { type: 'image/png' });
      const webpFile = new File([''], 'test.webp', { type: 'image/webp' });
      const gifFile = new File([''], 'test.gif', { type: 'image/gif' });

      expect(validateImageFile(jpegFile)).toBe(true);
      expect(validateImageFile(pngFile)).toBe(true);
      expect(validateImageFile(webpFile)).toBe(true);
      expect(validateImageFile(gifFile)).toBe(false); // Assuming GIF is not allowed
    });
  });

  describe('generateStoragePath', () => {
    it('should generate unique storage paths', () => {
      const userId = 'user_123';
      const filename = 'avatar.jpg';

      const path1 = generateStoragePath(userId, filename);
      const path2 = generateStoragePath(userId, filename);

      expect(path1).toContain(userId);
      expect(path1).toContain('jpg');
      expect(path1).not.toBe(path2); // Should be unique
    });

    it('should sanitize file names', () => {
      const userId = 'user_123';
      const filename = 'my avatar (1).jpg';

      const path = generateStoragePath(userId, filename);

      expect(path).not.toContain('(');
      expect(path).not.toContain(')');
      expect(path).not.toContain(' ');
    });

    it('should preserve file extensions', () => {
      const userId = 'user_123';
      const filenames = ['test.jpg', 'test.png', 'test.webp'];

      filenames.forEach((filename) => {
        const path = generateStoragePath(userId, filename);
        const extension = filename.split('.').pop();
        expect(path).toContain(extension);
      });
    });
  });

  describe('getImageMetadata', () => {
    it('should extract metadata from image files', () => {
      const file = new File(['x'.repeat(1024)], 'test.jpg', {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      const metadata = getImageMetadata(file);

      expect(metadata).toHaveProperty('name');
      expect(metadata).toHaveProperty('size');
      expect(metadata).toHaveProperty('type');
      expect(metadata).toHaveProperty('lastModified');
      expect(metadata.name).toBe('test.jpg');
      expect(metadata.size).toBe(1024);
      expect(metadata.type).toBe('image/jpeg');
    });

    it('should handle files without extension', () => {
      const file = new File([''], 'filename', { type: 'image/jpeg' });

      const metadata = getImageMetadata(file);

      expect(metadata.name).toBe('filename');
      expect(metadata.type).toBe('image/jpeg');
    });
  });

  describe('uploadProfileImage', () => {
    it('should upload valid image files', async () => {
      const { put } = require('@vercel/blob');
      put.mockResolvedValue({ url: 'https://blob.vercel-storage.com/test.jpg' });

      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const userId = 'user_123';

      const result = await uploadProfileImage(file, userId);

      expect(result.success).toBe(true);
      expect(result.url).toBe('https://blob.vercel-storage.com/test.jpg');
      expect(put).toHaveBeenCalled();
    });

    it('should reject invalid files', async () => {
      const file = new File([''], 'test.txt', { type: 'text/plain' });
      const userId = 'user_123';

      const result = await uploadProfileImage(file, userId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });

    it('should handle upload errors', async () => {
      const { put } = require('@vercel/blob');
      put.mockRejectedValue(new Error('Upload failed'));

      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const userId = 'user_123';

      const result = await uploadProfileImage(file, userId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Upload failed');
    });
  });

  describe('deleteProfileImage', () => {
    it('should delete images by URL', async () => {
      const { del } = require('@vercel/blob');
      del.mockResolvedValue(undefined);

      const imageUrl = 'https://blob.vercel-storage.com/test.jpg';

      const result = await deleteProfileImage(imageUrl);

      expect(result.success).toBe(true);
      expect(del).toHaveBeenCalledWith(imageUrl);
    });

    it('should handle deletion errors', async () => {
      const { del } = require('@vercel/blob');
      del.mockRejectedValue(new Error('Delete failed'));

      const imageUrl = 'https://blob.vercel-storage.com/test.jpg';

      const result = await deleteProfileImage(imageUrl);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Delete failed');
    });

    it('should validate URL format', async () => {
      const invalidUrl = 'not-a-valid-url';

      const result = await deleteProfileImage(invalidUrl);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid URL');
    });
  });
});
