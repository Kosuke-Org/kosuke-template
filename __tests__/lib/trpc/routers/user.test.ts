import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCaller } from '@/lib/trpc/server';
import { mockClerkUser } from '@/__tests__/setup/mocks';

vi.mock('@/lib/storage', () => ({
  uploadProfileImage: vi.fn(),
  deleteProfileImage: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  syncUserFromClerk: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', async () => {
  const actual = await vi.importActual('@clerk/nextjs/server');
  return {
    ...actual,
    clerkClient: vi.fn(() =>
      Promise.resolve({
        users: {
          getUser: vi.fn(() =>
            Promise.resolve({
              id: 'user_123',
              emailAddresses: [{ emailAddress: 'test@example.com' }],
              publicMetadata: {},
              imageUrl: 'https://example.com/old-avatar.jpg',
            })
          ),
          updateUser: vi.fn(() => Promise.resolve({ id: 'user_123' })),
        },
      })
    ),
  };
});

describe('User Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadProfileImage', () => {
    it('should upload profile image successfully', async () => {
      const { uploadProfileImage } = await import('@/lib/storage');
      const { syncUserFromClerk } = await import('@/lib/auth');

      vi.mocked(uploadProfileImage).mockResolvedValue(
        'https://blob.vercel-storage.com/new-avatar.jpg'
      );
      vi.mocked(syncUserFromClerk).mockResolvedValue({
        id: 'local_user_123',
        clerkUserId: 'user_123',
      } as any);

      const caller = await createCaller({
        userId: 'user_123',
        user: {
          ...mockClerkUser,
          imageUrl: 'https://example.com/old-avatar.jpg',
          publicMetadata: {},
        } as any,
        orgId: null,
        orgRole: null,
      });

      // Create a small base64 image (1x1 pixel PNG)
      const base64Image =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const result = await caller.user.uploadProfileImage({
        fileBase64: base64Image,
        fileName: 'avatar.png',
        mimeType: 'image/png',
      });

      expect(result.success).toBe(true);
      expect(result.imageUrl).toBe('https://blob.vercel-storage.com/new-avatar.jpg');
      expect(result.message).toContain('updated successfully');
      expect(uploadProfileImage).toHaveBeenCalled();
      expect(syncUserFromClerk).toHaveBeenCalled();
    });

    it('should throw error when file is too large', async () => {
      const caller = await createCaller({
        userId: 'user_123',
        user: mockClerkUser as any,
        orgId: null,
        orgRole: null,
      });

      // Create a large base64 string (simulating > 5MB file)
      const largeBase64 = 'data:image/png;base64,' + 'A'.repeat(7 * 1024 * 1024);

      await expect(
        caller.user.uploadProfileImage({
          fileBase64: largeBase64,
          fileName: 'large-avatar.png',
          mimeType: 'image/png',
        })
      ).rejects.toThrow('File too large');
    });

    it('should delete old image before uploading new one', async () => {
      const { uploadProfileImage, deleteProfileImage } = await import('@/lib/storage');
      const { syncUserFromClerk } = await import('@/lib/auth');

      vi.mocked(uploadProfileImage).mockResolvedValue('https://blob.vercel-storage.com/new.jpg');
      vi.mocked(deleteProfileImage).mockResolvedValue(undefined);
      vi.mocked(syncUserFromClerk).mockResolvedValue({} as any);

      const caller = await createCaller({
        userId: 'user_123',
        user: {
          ...mockClerkUser,
          imageUrl: 'https://blob.vercel-storage.com/old.jpg',
          publicMetadata: {},
        } as any,
        orgId: null,
        orgRole: null,
      });

      const base64Image =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      await caller.user.uploadProfileImage({
        fileBase64: base64Image,
        fileName: 'avatar.png',
        mimeType: 'image/png',
      });

      expect(deleteProfileImage).toHaveBeenCalledWith('https://blob.vercel-storage.com/old.jpg');
    });
  });

  describe('deleteProfileImage', () => {
    it('should delete profile image successfully', async () => {
      const { deleteProfileImage } = await import('@/lib/storage');
      const { syncUserFromClerk } = await import('@/lib/auth');

      vi.mocked(deleteProfileImage).mockResolvedValue(undefined);
      vi.mocked(syncUserFromClerk).mockResolvedValue({} as any);

      const caller = await createCaller({
        userId: 'user_123',
        user: {
          ...mockClerkUser,
          imageUrl: 'https://blob.vercel-storage.com/avatar.jpg',
          publicMetadata: {},
        } as any,
        orgId: null,
        orgRole: null,
      });

      const result = await caller.user.deleteProfileImage();

      expect(result.success).toBe(true);
      expect(result.message).toContain('deleted successfully');
      expect(deleteProfileImage).toHaveBeenCalledWith('https://blob.vercel-storage.com/avatar.jpg');
      expect(syncUserFromClerk).toHaveBeenCalled();
    });

    it('should throw error when no profile image to delete', async () => {
      const caller = await createCaller({
        userId: 'user_123',
        user: {
          ...mockClerkUser,
          imageUrl: null,
          publicMetadata: {},
        } as any,
        orgId: null,
        orgRole: null,
      });

      await expect(caller.user.deleteProfileImage()).rejects.toThrow('No profile image to delete');
    });
  });
});
