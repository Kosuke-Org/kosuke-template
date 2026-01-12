/**
 * Invitation Service Tests
 * Tests for invitation-related database operations and business logic
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { auth } from '@/lib/auth/providers';
import { db } from '@/lib/db/drizzle';
import {
  cancelInvitation,
  checkPendingInvitation,
  createInvitation,
} from '@/lib/services/invitation-service';

// Mock the database
vi.mock('@/lib/db/drizzle', () => ({
  db: {
    select: vi.fn(),
  },
}));

// Mock better-auth
vi.mock('@/lib/auth/providers', () => ({
  auth: {
    api: {
      createInvitation: vi.fn(),
      cancelInvitation: vi.fn(),
    },
  },
}));

describe('Invitation Service', () => {
  const mockEmail = 'test@example.com';
  const mockOrgId = 'org-123';
  const mockInvitationId = 'invitation-123';
  const mockRole = 'member';
  const mockHeaders = new Headers();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkPendingInvitation', () => {
    it('should return true when pending invitation exists', async () => {
      const mockPendingInvitation = {
        id: mockInvitationId,
        organizationId: mockOrgId,
        email: mockEmail,
        role: mockRole,
        status: 'pending',
        expiresAt: new Date(),
        inviterId: 'user-123',
      };

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockPendingInvitation]),
        }),
      });

      vi.mocked(db.select).mockReturnValue(mockSelect());

      const result = await checkPendingInvitation({ email: mockEmail, organizationId: mockOrgId });

      expect(result).toBe(true);
      expect(db.select).toHaveBeenCalled();
    });

    it('should return false when no pending invitation exists', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      vi.mocked(db.select).mockReturnValue(mockSelect());

      const result = await checkPendingInvitation({ email: mockEmail, organizationId: mockOrgId });

      expect(result).toBe(false);
    });
  });

  describe('createInvitation', () => {
    it('should create invitation when no pending invitation exists', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      vi.mocked(db.select).mockReturnValue(mockSelect());

      const result = await createInvitation({
        email: mockEmail,
        organizationId: mockOrgId,
        role: mockRole,
        headers: mockHeaders,
      });

      expect(result).toEqual({
        success: true,
        message: 'Member invited successfully',
      });
      expect(auth.api.createInvitation).toHaveBeenCalledWith({
        body: {
          email: mockEmail,
          role: mockRole,
          organizationId: mockOrgId,
          resend: true,
        },
        headers: mockHeaders,
      });
    });

    it('should throw error when pending invitation already exists', async () => {
      const mockPendingInvitation = {
        id: mockInvitationId,
        organizationId: mockOrgId,
        email: mockEmail,
        role: mockRole,
        status: 'pending',
        expiresAt: new Date(),
        inviterId: 'user-123',
      };

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockPendingInvitation]),
        }),
      });

      vi.mocked(db.select).mockReturnValue(mockSelect());

      await expect(
        createInvitation({
          email: mockEmail,
          organizationId: mockOrgId,
          role: mockRole,
          headers: mockHeaders,
        })
      ).rejects.toThrow('User already has an invitation to this organization');

      expect(auth.api.createInvitation).not.toHaveBeenCalled();
    });

    it('should handle different roles correctly', async () => {
      const adminRole = 'admin';

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      vi.mocked(db.select).mockReturnValue(mockSelect());

      await createInvitation({
        email: mockEmail,
        organizationId: mockOrgId,
        role: adminRole,
        headers: mockHeaders,
      });

      expect(auth.api.createInvitation).toHaveBeenCalledWith({
        body: {
          email: mockEmail,
          role: adminRole,
          organizationId: mockOrgId,
          resend: true,
        },
        headers: mockHeaders,
      });
    });
  });

  describe('cancelInvitation', () => {
    it('should cancel invitation successfully', async () => {
      vi.mocked(auth.api.cancelInvitation).mockResolvedValue(null);

      const result = await cancelInvitation({
        invitationId: mockInvitationId,
        headers: mockHeaders,
      });

      expect(result).toEqual({
        success: true,
        message: 'Invitation cancelled successfully',
      });

      expect(auth.api.cancelInvitation).toHaveBeenCalledWith({
        body: {
          invitationId: mockInvitationId,
        },
        headers: mockHeaders,
      });
    });

    it('should propagate errors from auth API', async () => {
      const errorMessage = 'Invitation not found';
      vi.mocked(auth.api.cancelInvitation).mockRejectedValue(new Error(errorMessage));

      await expect(
        cancelInvitation({ invitationId: mockInvitationId, headers: mockHeaders })
      ).rejects.toThrow(errorMessage);
    });
  });
});
