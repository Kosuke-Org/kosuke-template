/**
 * Member Service Tests
 * Tests for member-related operations and business logic
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { auth } from '@/lib/auth/providers';
import { switchToNextOrganization } from '@/lib/organizations';
import {
  getOrganizationMembers,
  leaveOrganization,
  removeMember,
  updateMemberRole,
} from '@/lib/services/member-service';

// Mock better-auth
vi.mock('@/lib/auth/providers', () => ({
  auth: {
    api: {
      listMembers: vi.fn(),
      updateMemberRole: vi.fn(),
      removeMember: vi.fn(),
      leaveOrganization: vi.fn(),
    },
  },
}));

// Mock organization utilities
vi.mock('@/lib/organizations', () => ({
  switchToNextOrganization: vi.fn(),
}));

describe('Member Service', () => {
  const mockOrgId = 'org-123';
  const mockMemberId = 'member-123';
  const mockUserId = 'user-123';
  const mockEmail = 'test@example.com';
  const mockHeaders = new Headers();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getOrganizationMembers', () => {
    it('should return organization members', async () => {
      const mockMembers = [
        {
          id: mockMemberId,
          userId: mockUserId,
          organizationId: mockOrgId,
          role: 'member' as const,
          createdAt: new Date(),
          user: {
            id: mockUserId,
            email: mockEmail,
            name: 'Test User',
            image: undefined,
          },
        },
      ];

      const mockResponse = {
        members: mockMembers,
        total: mockMembers.length,
      };

      vi.mocked(auth.api.listMembers).mockResolvedValue(mockResponse);

      const result = await getOrganizationMembers({
        organizationId: mockOrgId,
        headers: mockHeaders,
      });

      expect(result).toEqual({
        members: mockMembers,
        total: mockMembers.length,
      });

      expect(auth.api.listMembers).toHaveBeenCalledWith({
        query: {
          organizationId: mockOrgId,
        },
        headers: mockHeaders,
      });
    });

    it('should handle empty member list', async () => {
      const mockResponse = { members: [], total: 0 };

      vi.mocked(auth.api.listMembers).mockResolvedValue(
        mockResponse as Awaited<ReturnType<typeof auth.api.listMembers>>
      );

      const result = await getOrganizationMembers({
        organizationId: mockOrgId,
        headers: mockHeaders,
      });

      expect(result).toEqual({ members: [], total: 0 });
    });

    it('should propagate errors from auth API', async () => {
      const errorMessage = 'Failed to fetch members';
      vi.mocked(auth.api.listMembers).mockRejectedValue(new Error(errorMessage));

      await expect(
        getOrganizationMembers({
          organizationId: mockOrgId,
          headers: mockHeaders,
        })
      ).rejects.toThrow(errorMessage);
    });
  });

  describe('updateMemberRole', () => {
    it('should update member role successfully', async () => {
      const newRole = 'admin' as const;

      const result = await updateMemberRole({
        organizationId: mockOrgId,
        memberId: mockMemberId,
        role: newRole,
        headers: mockHeaders,
      });

      expect(result).toEqual({
        success: true,
        message: 'Member role updated successfully',
      });

      expect(auth.api.updateMemberRole).toHaveBeenCalledWith({
        body: {
          role: newRole,
          memberId: mockMemberId,
          organizationId: mockOrgId,
        },
        headers: mockHeaders,
      });
    });

    it('should propagate errors from auth API', async () => {
      const errorMessage = 'Insufficient permissions';
      vi.mocked(auth.api.updateMemberRole).mockRejectedValue(new Error(errorMessage));

      await expect(
        updateMemberRole({
          organizationId: mockOrgId,
          memberId: mockMemberId,
          role: 'admin',
          headers: mockHeaders,
        })
      ).rejects.toThrow(errorMessage);
    });
  });

  describe('removeMember', () => {
    it('should remove member by ID successfully', async () => {
      const result = await removeMember({
        organizationId: mockOrgId,
        memberIdOrEmail: mockMemberId,
        headers: mockHeaders,
      });

      expect(result).toEqual({
        success: true,
        message: 'Member removed successfully',
      });
      expect(auth.api.removeMember).toHaveBeenCalledWith({
        body: {
          memberIdOrEmail: mockMemberId,
          organizationId: mockOrgId,
        },
        headers: mockHeaders,
      });
    });

    it('should remove member by email successfully', async () => {
      const result = await removeMember({
        organizationId: mockOrgId,
        memberIdOrEmail: mockEmail,
        headers: mockHeaders,
      });

      expect(result).toEqual({
        success: true,
        message: 'Member removed successfully',
      });

      expect(auth.api.removeMember).toHaveBeenCalledWith({
        body: {
          memberIdOrEmail: mockEmail,
          organizationId: mockOrgId,
        },
        headers: mockHeaders,
      });
    });

    it('should propagate errors from auth API', async () => {
      const errorMessage = 'Member not found';
      vi.mocked(auth.api.removeMember).mockRejectedValue(new Error(errorMessage));

      await expect(
        removeMember({
          organizationId: mockOrgId,
          memberIdOrEmail: mockMemberId,
          headers: mockHeaders,
        })
      ).rejects.toThrow(errorMessage);
    });
  });

  describe('leaveOrganization', () => {
    it('should leave organization and switch to next org', async () => {
      const result = await leaveOrganization({
        organizationId: mockOrgId,
        userId: mockUserId,
        headers: mockHeaders,
      });

      expect(result).toEqual({
        success: true,
        message: 'You have left the organization',
      });
      expect(auth.api.leaveOrganization).toHaveBeenCalledWith({
        body: {
          organizationId: mockOrgId,
        },
        headers: mockHeaders,
      });
      expect(switchToNextOrganization).toHaveBeenCalledWith(mockUserId);
    });

    it('should call switchToNextOrganization even if leave succeeds', async () => {
      await leaveOrganization({
        organizationId: mockOrgId,
        userId: mockUserId,
        headers: mockHeaders,
      });

      expect(switchToNextOrganization).toHaveBeenCalledTimes(1);
    });

    it('should not call switchToNextOrganization if leave fails', async () => {
      const errorMessage = 'Cannot leave organization';
      vi.mocked(auth.api.leaveOrganization).mockRejectedValue(new Error(errorMessage));

      await expect(
        leaveOrganization({
          organizationId: mockOrgId,
          userId: mockUserId,
          headers: mockHeaders,
        })
      ).rejects.toThrow(errorMessage);

      expect(switchToNextOrganization).not.toHaveBeenCalled();
    });

    it('should propagate errors from switchToNextOrganization', async () => {
      const errorMessage = 'Failed to switch organization';
      vi.mocked(switchToNextOrganization).mockRejectedValue(new Error(errorMessage));

      await expect(
        leaveOrganization({
          organizationId: mockOrgId,
          userId: mockUserId,
          headers: mockHeaders,
        })
      ).rejects.toThrow(errorMessage);
    });
  });
});
