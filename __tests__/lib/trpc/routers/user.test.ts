import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockTRPCContext } from '@/__tests__/setup/mocks';

import { appRouter } from '@/lib/trpc/router';

vi.mock('@/lib/auth/providers', () => ({
  auth: {
    api: {
      getActiveMemberRole: vi.fn(),
      getFullOrganization: vi.fn(),
      updateOrganization: vi.fn(),
    },
  },
}));

vi.mock('@/lib/storage', () => ({
  uploadProfileImage: vi.fn(),
  deleteProfileImage: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({})),
}));

describe('User Router', () => {
  const mockOrgId = '123e4567-e89b-12d3-a456-426614174000';
  const base64Image =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  let caller: ReturnType<typeof appRouter.createCaller>;
  let auth: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  let uploadProfileImage: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  let deleteProfileImage: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  beforeEach(async () => {
    vi.clearAllMocks();

    // Dynamically import after mocks are applied
    ({ auth } = await import('@/lib/auth/providers'));
    ({ uploadProfileImage, deleteProfileImage } = await import('@/lib/storage'));

    // Default happy-path mocks
    auth.api.getActiveMemberRole.mockResolvedValue({ role: 'admin' });
    auth.api.updateOrganization.mockResolvedValue({});
    auth.api.getFullOrganization.mockResolvedValue({
      id: '123e4567-e89b-12d3-a456-426614174000',
      logo: 'http://localhost:3000/uploads/old-logo.png',
    });
    uploadProfileImage.mockResolvedValue('http://localhost:3000/uploads/new-logo.png');
    deleteProfileImage.mockResolvedValue(undefined);

    const ctx = await createMockTRPCContext({
      userId: 'user_123',
    });
    caller = await appRouter.createCaller(ctx);
  });

  describe('uploadOrganizationLogo', () => {
    it('uploads a logo successfully for admin/owner', async () => {
      const result = await caller.organizations.uploadOrganizationLogo({
        fileBase64: base64Image,
        fileName: 'logo.png',
        mimeType: 'image/png',
      });

      expect(uploadProfileImage).toHaveBeenCalledWith(expect.any(File), mockOrgId);
      expect(result).toEqual({
        success: true,
        message: 'Organization logo uploaded successfully',
      });
    });

    it('throws FORBIDDEN when role is not admin or owner', async () => {
      auth.api.getActiveMemberRole.mockResolvedValueOnce({ role: 'member' });

      expect(
        caller.organizations.uploadOrganizationLogo({
          fileBase64: base64Image,
          fileName: 'logo.png',
          mimeType: 'image/png',
        })
      ).rejects.toThrow(/Only organization admins and owners can upload the logo/);
    });

    it('throws BAD_REQUEST when file size exceeds 2MB', async () => {
      const largeBase64 = 'data:image/png;base64,' + 'A'.repeat(3 * 1024 * 1024);

      expect(
        caller.organizations.uploadOrganizationLogo({
          fileBase64: largeBase64,
          fileName: 'big-logo.png',
          mimeType: 'image/png',
        })
      ).rejects.toThrow(/File size must be less than 2MB/);
    });

    it('throws INTERNAL_SERVER_ERROR when upload fails', async () => {
      uploadProfileImage.mockRejectedValueOnce(new Error('Upload failed'));
      await expect(
        caller.organizations.uploadOrganizationLogo({
          fileBase64: base64Image,
          fileName: 'logo.png',
          mimeType: 'image/png',
        })
      ).rejects.toThrow(/Upload failed/);
    });
  });

  describe('deleteOrganizationLogo', () => {
    it('deletes an existing logo successfully', async () => {
      const result = await caller.organizations.deleteOrganizationLogo();

      expect(auth.api.getActiveMemberRole).toHaveBeenCalled();
      expect(auth.api.getFullOrganization).toHaveBeenCalled();
      expect(deleteProfileImage).toHaveBeenCalledWith('http://localhost:3000/uploads/old-logo.png');
      expect(auth.api.updateOrganization).toHaveBeenCalledWith({
        body: { data: { logo: '' } },
        headers: expect.any(Object),
      });
      expect(result).toEqual({
        success: true,
        message: 'Organization logo deleted successfully',
      });
    });

    it('throws BAD_REQUEST when no logo exists', async () => {
      auth.api.getFullOrganization.mockResolvedValueOnce();
      await expect(caller.organizations.deleteOrganizationLogo()).rejects.toThrow(
        /Organization logo not found/
      );
    });

    it('throws FORBIDDEN when role is not admin or owner', async () => {
      auth.api.getActiveMemberRole.mockResolvedValueOnce({ role: 'member' });
      await expect(caller.organizations.deleteOrganizationLogo()).rejects.toThrow(
        /Only organization admins and owners can delete the logo/
      );
    });
  });
});
