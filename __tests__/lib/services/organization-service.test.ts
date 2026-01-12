/**
 * Organization Service Tests
 * Tests for organization-related operations and business logic
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { auth } from '@/lib/auth/providers';
import { generateUniqueOrgSlug, switchToNextOrganization } from '@/lib/organizations';
import { ERRORS } from '@/lib/services/constants';
import {
  createOrganization,
  deleteOrganization,
  deleteOrganizationLogo,
  getOrganizationById,
  getOrganizationBySlug,
  getUserOrganizations,
  isGoogleApiKeyConfigured,
  updateOrganization,
  uploadOrganizationLogo,
} from '@/lib/services/organization-service';
import { deleteProfileImage, uploadProfileImage } from '@/lib/storage';

// Mock better-auth
vi.mock('@/lib/auth/providers', () => ({
  auth: {
    api: {
      listOrganizations: vi.fn(),
      getFullOrganization: vi.fn(),
      createOrganization: vi.fn(),
      updateOrganization: vi.fn(),
      deleteOrganization: vi.fn(),
      setActiveOrganization: vi.fn(),
      getActiveMemberRole: vi.fn(),
    },
  },
}));

// Mock organization utilities
vi.mock('@/lib/organizations', () => ({
  generateUniqueOrgSlug: vi.fn(),
  switchToNextOrganization: vi.fn(),
}));

// Mock storage utilities
vi.mock('@/lib/storage', () => ({
  uploadProfileImage: vi.fn(),
  deleteProfileImage: vi.fn(),
}));

describe('Organization Service', () => {
  const mockOrgId = 'org-123';
  const mockUserId = 'user-123';
  const mockSlug = 'test-org';
  const mockHeaders = new Headers();
  const mockOrg = {
    id: mockOrgId,
    name: 'Test Organization',
    slug: mockSlug,
    logo: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    members: [],
    invitations: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getUserOrganizations', () => {
    it('should return user organizations', async () => {
      const mockOrgs = [mockOrg];
      vi.mocked(auth.api.listOrganizations).mockResolvedValue(mockOrgs);

      const result = await getUserOrganizations({ userId: mockUserId, headers: mockHeaders });

      expect(result).toEqual(mockOrgs);
      expect(auth.api.listOrganizations).toHaveBeenCalledWith({
        query: {
          userId: mockUserId,
        },
        headers: mockHeaders,
      });
    });

    it('should handle empty organization list', async () => {
      vi.mocked(auth.api.listOrganizations).mockResolvedValue([]);

      const result = await getUserOrganizations({ userId: mockUserId, headers: mockHeaders });

      expect(result).toEqual([]);
    });
  });

  describe('getOrganizationById', () => {
    it('should return organization by ID', async () => {
      vi.mocked(auth.api.getFullOrganization).mockResolvedValue(mockOrg);

      const result = await getOrganizationById({ organizationId: mockOrgId, headers: mockHeaders });

      expect(result).toEqual(mockOrg);
      expect(auth.api.getFullOrganization).toHaveBeenCalledWith({
        query: {
          organizationId: mockOrgId,
          membersLimit: 100,
        },
        headers: mockHeaders,
      });
    });

    it('should propagate errors from auth API', async () => {
      const errorMessage = 'Organization not found';
      vi.mocked(auth.api.getFullOrganization).mockRejectedValue(new Error(errorMessage));

      await expect(
        getOrganizationById({ organizationId: mockOrgId, headers: mockHeaders })
      ).rejects.toThrow(errorMessage);
    });
  });

  describe('getOrganizationBySlug', () => {
    it('should return organization by slug', async () => {
      vi.mocked(auth.api.getFullOrganization).mockResolvedValue(mockOrg);

      const result = await getOrganizationBySlug({ slug: mockSlug, headers: mockHeaders });

      expect(result).toEqual(mockOrg);
      expect(auth.api.getFullOrganization).toHaveBeenCalledWith({
        query: {
          organizationSlug: mockSlug,
        },
        headers: mockHeaders,
      });
    });

    it('should throw error when organization not found', async () => {
      vi.mocked(auth.api.getFullOrganization).mockRejectedValue(new Error('Not found'));

      await expect(getOrganizationBySlug({ slug: mockSlug, headers: mockHeaders })).rejects.toThrow(
        `Organization ${mockSlug} not found`
      );
    });
  });

  describe('createOrganization', () => {
    it('should create organization and set as active', async () => {
      const orgName = 'New Organization';
      const generatedSlug = 'new-organization';

      vi.mocked(generateUniqueOrgSlug).mockResolvedValue(generatedSlug);
      vi.mocked(auth.api.createOrganization).mockResolvedValue({
        ...mockOrg,
        id: mockOrgId,
      });
      vi.mocked(auth.api.setActiveOrganization).mockResolvedValue(null);

      const result = await createOrganization({ name: orgName, headers: mockHeaders });

      expect(result).toEqual({ ...mockOrg, id: mockOrgId });
      expect(generateUniqueOrgSlug).toHaveBeenCalledWith(orgName);
      expect(auth.api.createOrganization).toHaveBeenCalledWith({
        body: {
          name: orgName,
          slug: generatedSlug,
          keepCurrentActiveOrganization: false,
        },
        headers: mockHeaders,
      });
      expect(auth.api.setActiveOrganization).toHaveBeenCalledWith({
        body: {
          organizationId: mockOrgId,
        },
        headers: mockHeaders,
      });
    });

    it('should not set active org if creation returns no ID', async () => {
      vi.mocked(generateUniqueOrgSlug).mockResolvedValue('test-slug');
      vi.mocked(auth.api.createOrganization).mockResolvedValue(null);

      await createOrganization({ name: 'Test', headers: mockHeaders });

      expect(auth.api.setActiveOrganization).not.toHaveBeenCalled();
    });

    it('should throw error when creation fails', async () => {
      const errorMessage = 'Failed to create';
      vi.mocked(generateUniqueOrgSlug).mockResolvedValue('test-slug');
      vi.mocked(auth.api.createOrganization).mockRejectedValue(new Error(errorMessage));

      await expect(createOrganization({ name: 'Test', headers: mockHeaders })).rejects.toThrow(
        errorMessage
      );
    });
  });

  describe('updateOrganization', () => {
    it('should update organization with provided data', async () => {
      const updates = { name: 'Updated Name', slug: 'updated-slug' };
      const updatedOrg = { ...mockOrg, ...updates, metadata: {} };

      vi.mocked(auth.api.updateOrganization).mockResolvedValue(updatedOrg);

      const result = await updateOrganization({
        organizationId: mockOrgId,
        data: updates,
        headers: mockHeaders,
      });

      expect(result).toEqual(updatedOrg);
      expect(auth.api.updateOrganization).toHaveBeenCalledWith({
        body: {
          data: updates,
          organizationId: mockOrgId,
        },
        headers: mockHeaders,
      });
    });

    it('should handle partial updates', async () => {
      const updates = { name: 'Only Name Update' };

      vi.mocked(auth.api.updateOrganization).mockResolvedValue(mockOrg);

      await updateOrganization({ organizationId: mockOrgId, data: updates, headers: mockHeaders });

      expect(auth.api.updateOrganization).toHaveBeenCalledWith({
        body: {
          data: updates,
          organizationId: mockOrgId,
        },
        headers: mockHeaders,
      });
    });

    it('should throw error when update fails', async () => {
      const errorMessage = 'Update failed';
      vi.mocked(auth.api.updateOrganization).mockRejectedValue(new Error(errorMessage));

      await expect(
        updateOrganization({ organizationId: mockOrgId, data: {}, headers: mockHeaders })
      ).rejects.toThrow(errorMessage);
    });
  });

  describe('deleteOrganization', () => {
    it('should delete organization as owner', async () => {
      vi.mocked(auth.api.getActiveMemberRole).mockResolvedValue({ role: 'owner' });
      vi.mocked(auth.api.getFullOrganization).mockResolvedValue(mockOrg);

      const result = await deleteOrganization({
        organizationId: mockOrgId,
        userId: mockUserId,
        headers: mockHeaders,
      });

      expect(result).toEqual({
        success: true,
        message: 'Organization deleted successfully',
      });
      expect(auth.api.deleteOrganization).toHaveBeenCalledWith({
        body: {
          organizationId: mockOrgId,
        },
        headers: mockHeaders,
      });
      expect(switchToNextOrganization).toHaveBeenCalledWith(mockUserId);
    });

    it('should delete organization logo if it exists', async () => {
      const orgWithLogo = { ...mockOrg, logo: 'https://example.com/logo.png' };

      vi.mocked(auth.api.getActiveMemberRole).mockResolvedValue({ role: 'owner' });
      vi.mocked(auth.api.getFullOrganization).mockResolvedValue(orgWithLogo);

      await deleteOrganization({
        organizationId: mockOrgId,
        userId: mockUserId,
        headers: mockHeaders,
      });

      expect(deleteProfileImage).toHaveBeenCalledWith(orgWithLogo.logo);
    });

    it('should throw error if user is not owner', async () => {
      vi.mocked(auth.api.getActiveMemberRole).mockResolvedValue({ role: 'admin' });

      const error = await deleteOrganization({
        organizationId: mockOrgId,
        userId: mockUserId,
        headers: mockHeaders,
      }).catch((e) => e);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Only organization owners can delete the organization');
      expect(error.cause).toBe(ERRORS.FORBIDDEN);
      expect(auth.api.deleteOrganization).not.toHaveBeenCalled();
    });

    it('should throw error if organization not found', async () => {
      vi.mocked(auth.api.getActiveMemberRole).mockResolvedValue({ role: 'owner' });
      vi.mocked(auth.api.getFullOrganization).mockResolvedValue(null);

      await expect(
        deleteOrganization({ organizationId: mockOrgId, userId: mockUserId, headers: mockHeaders })
      ).rejects.toThrow('Organization not found');
    });
  });

  describe('uploadOrganizationLogo', () => {
    const mockFileData = {
      fileBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==',
      fileName: 'logo.png',
      mimeType: 'image/png' as const,
    };

    it('should upload logo as admin', async () => {
      vi.mocked(auth.api.getActiveMemberRole).mockResolvedValue({ role: 'admin' });
      vi.mocked(auth.api.getFullOrganization).mockResolvedValue(mockOrg);
      vi.mocked(uploadProfileImage).mockResolvedValue('https://example.com/logo.png');
      vi.mocked(auth.api.updateOrganization).mockResolvedValue(mockOrg);

      const result = await uploadOrganizationLogo({ ...mockFileData, headers: mockHeaders });

      expect(result).toEqual({
        success: true,
        message: 'Organization logo uploaded successfully',
      });
      expect(uploadProfileImage).toHaveBeenCalled();
      expect(auth.api.updateOrganization).toHaveBeenCalledWith({
        body: {
          data: {
            logo: 'https://example.com/logo.png',
          },
          organizationId: mockOrgId,
        },
        headers: mockHeaders,
      });
    });

    it('should upload logo as owner', async () => {
      vi.mocked(auth.api.getActiveMemberRole).mockResolvedValue({ role: 'owner' });
      vi.mocked(auth.api.getFullOrganization).mockResolvedValue(mockOrg);
      vi.mocked(uploadProfileImage).mockResolvedValue('https://example.com/logo.png');
      vi.mocked(auth.api.updateOrganization).mockResolvedValue(mockOrg);

      const result = await uploadOrganizationLogo({ ...mockFileData, headers: mockHeaders });

      expect(result.success).toBe(true);
    });

    it('should throw error if user is member', async () => {
      vi.mocked(auth.api.getActiveMemberRole).mockResolvedValue({ role: 'member' });

      const error = await uploadOrganizationLogo({
        ...mockFileData,
        headers: mockHeaders,
      }).catch((e) => e);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Only organization admins and owners can upload the logo');
      expect(error.cause).toBe(ERRORS.FORBIDDEN);
      expect(uploadProfileImage).not.toHaveBeenCalled();
    });

    it('should throw error if file is too large', async () => {
      // Create a large base64 string (>2MB)
      const largeBase64 = 'x'.repeat(3 * 1024 * 1024);
      const largeFileData = {
        ...mockFileData,
        fileBase64: largeBase64,
      };

      vi.mocked(auth.api.getActiveMemberRole).mockResolvedValue({ role: 'admin' });
      vi.mocked(auth.api.getFullOrganization).mockResolvedValue(mockOrg);

      await expect(
        uploadOrganizationLogo({ ...largeFileData, headers: mockHeaders })
      ).rejects.toThrow('File size must be less than 2MB');

      expect(uploadProfileImage).not.toHaveBeenCalled();
    });

    it('should throw error if organization not found', async () => {
      vi.mocked(auth.api.getActiveMemberRole).mockResolvedValue({ role: 'admin' });
      vi.mocked(auth.api.getFullOrganization).mockResolvedValue(null);

      await expect(
        uploadOrganizationLogo({ ...mockFileData, headers: mockHeaders })
      ).rejects.toThrow('Organization not found');
    });
  });

  describe('deleteOrganizationLogo', () => {
    it('should delete logo as admin', async () => {
      const orgWithLogo = { ...mockOrg, logo: 'https://example.com/logo.png' };

      vi.mocked(auth.api.getActiveMemberRole).mockResolvedValue({ role: 'admin' });
      vi.mocked(auth.api.getFullOrganization).mockResolvedValue(orgWithLogo);
      vi.mocked(deleteProfileImage).mockResolvedValue(undefined);
      vi.mocked(auth.api.updateOrganization).mockResolvedValue(mockOrg);

      const result = await deleteOrganizationLogo({ headers: mockHeaders });

      expect(result).toEqual({
        success: true,
        message: 'Organization logo deleted successfully',
      });
      expect(deleteProfileImage).toHaveBeenCalledWith(orgWithLogo.logo);
      expect(auth.api.updateOrganization).toHaveBeenCalledWith({
        body: {
          data: {
            logo: '',
          },
        },
        headers: mockHeaders,
      });
    });

    it('should delete logo as owner', async () => {
      const orgWithLogo = { ...mockOrg, logo: 'https://example.com/logo.png' };

      vi.mocked(auth.api.getActiveMemberRole).mockResolvedValue({ role: 'owner' });
      vi.mocked(auth.api.getFullOrganization).mockResolvedValue(orgWithLogo);
      vi.mocked(deleteProfileImage).mockResolvedValue(undefined);
      vi.mocked(auth.api.updateOrganization).mockResolvedValue(mockOrg);

      const result = await deleteOrganizationLogo({ headers: mockHeaders });

      expect(result.success).toBe(true);
    });

    it('should throw error if user is member', async () => {
      vi.mocked(auth.api.getActiveMemberRole).mockResolvedValue({ role: 'member' });

      const error = await deleteOrganizationLogo({ headers: mockHeaders }).catch((e) => e);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Only organization admins and owners can delete the logo');
      expect(error.cause).toBe(ERRORS.FORBIDDEN);
      expect(deleteProfileImage).not.toHaveBeenCalled();
    });

    it('should throw error if no logo exists', async () => {
      vi.mocked(auth.api.getActiveMemberRole).mockResolvedValue({ role: 'admin' });
      vi.mocked(auth.api.getFullOrganization).mockResolvedValue(mockOrg);

      await expect(deleteOrganizationLogo({ headers: mockHeaders })).rejects.toThrow(
        'Organization logo not found'
      );

      expect(deleteProfileImage).not.toHaveBeenCalled();
    });
  });

  describe('isGoogleApiKeyConfigured', () => {
    it('should return true when API key is configured', () => {
      vi.stubEnv('GOOGLE_AI_API_KEY', 'test-key');

      const result = isGoogleApiKeyConfigured();

      expect(result).toBe(true);
    });

    it('should return false when API key is not configured', () => {
      vi.stubEnv('GOOGLE_AI_API_KEY', '');

      const result = isGoogleApiKeyConfigured();

      expect(result).toBe(false);
    });
  });
});
