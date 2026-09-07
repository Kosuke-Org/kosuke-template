import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockTRPCContext } from '@/__tests__/setup/mocks';
import { expectTRPCError } from '@/__tests__/setup/utils';

import * as configService from '@/lib/services/config-service';
import { ERRORS } from '@/lib/services/constants';
import * as invitationService from '@/lib/services/invitation-service';
import * as memberService from '@/lib/services/member-service';
import * as organizationService from '@/lib/services/organization-service';
import { createCaller } from '@/lib/trpc/server';

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers({ cookie: 'session=abc' })),
}));

vi.mock('@/lib/services/organization-service', () => ({
  getUserOrganizations: vi.fn(),
  getOrganizationById: vi.fn(),
  getOrganizationBySlug: vi.fn(),
  createOrganization: vi.fn(),
  updateOrganization: vi.fn(),
  deleteOrganization: vi.fn(),
  uploadOrganizationLogo: vi.fn(),
  deleteOrganizationLogo: vi.fn(),
}));

vi.mock('@/lib/services/member-service', () => ({
  getOrganizationMembers: vi.fn(),
  updateMemberRole: vi.fn(),
  removeMember: vi.fn(),
  leaveOrganization: vi.fn(),
}));

vi.mock('@/lib/services/invitation-service', () => ({
  createInvitation: vi.fn(),
  cancelInvitation: vi.fn(),
}));

vi.mock('@/lib/services/config-service', () => ({
  isGoogleApiKeyConfigured: vi.fn(),
}));

describe('Organizations Router', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const otherUserId = '99999999-9999-4999-8999-999999999999';
  const organizationId = '22222222-2222-4222-8222-222222222222';
  const invitationId = '33333333-3333-4333-8333-333333333333';
  const memberId = '44444444-4444-4444-8444-444444444444';

  const mockOrganization = {
    id: organizationId,
    name: 'Acme',
    slug: 'acme',
    logo: null,
    createdAt: new Date('2026-01-01'),
    metadata: null,
  };

  const authedCaller = () => createCaller(createMockTRPCContext({ userId }));
  const anonCaller = () => createCaller(createMockTRPCContext({ userId: null }));

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authorization model', () => {
    it('rejects every unauthenticated caller across read and write procedures', async () => {
      const caller = await anonCaller();

      await expectTRPCError(caller.organizations.getUserOrganizations({ userId }), 'UNAUTHORIZED');
      await expectTRPCError(
        caller.organizations.getOrganization({ organizationId }),
        'UNAUTHORIZED'
      );
      await expectTRPCError(caller.organizations.getOrgMembers({ organizationId }), 'UNAUTHORIZED');
      await expectTRPCError(
        caller.organizations.createOrganization({ name: 'Acme' }),
        'UNAUTHORIZED'
      );
      await expectTRPCError(
        caller.organizations.deleteOrganization({ organizationId }),
        'UNAUTHORIZED'
      );
      await expectTRPCError(caller.organizations.checkGoogleApiKey(), 'UNAUTHORIZED');

      expect(organizationService.getUserOrganizations).not.toHaveBeenCalled();
      expect(organizationService.deleteOrganization).not.toHaveBeenCalled();
    });

    it('performs no membership check of its own - a logged-in non-member reaches the service', async () => {
      // Every procedure here is protectedProcedure, not orgProcedure/orgOwnerProcedure.
      // Membership and role enforcement live entirely in the service layer via Better Auth headers.
      vi.mocked(organizationService.getOrganizationById).mockResolvedValue(
        mockOrganization as never
      );

      const caller = await authedCaller();
      await caller.organizations.getOrganization({ organizationId });

      expect(organizationService.getOrganizationById).toHaveBeenCalledWith({
        organizationId,
        headers: expect.any(Headers),
      });
    });

    it('surfaces the FORBIDDEN a service raises for a non-owner deleting an organization', async () => {
      vi.mocked(organizationService.deleteOrganization).mockRejectedValue(
        new Error('Only organization owners can delete the organization', {
          cause: ERRORS.FORBIDDEN,
        })
      );

      const caller = await authedCaller();

      await expectTRPCError(
        caller.organizations.deleteOrganization({ organizationId }),
        'FORBIDDEN',
        'Only organization owners can delete the organization'
      );
    });
  });

  describe('getUserOrganizations', () => {
    it('returns the organizations for the requested user', async () => {
      vi.mocked(organizationService.getUserOrganizations).mockResolvedValue([
        mockOrganization,
      ] as never);

      const caller = await authedCaller();
      const result = await caller.organizations.getUserOrganizations({ userId });

      expect(result).toEqual([mockOrganization]);
      expect(organizationService.getUserOrganizations).toHaveBeenCalledWith({
        userId,
        headers: expect.any(Headers),
      });
    });

    it('forwards a userId from the input without comparing it to the session user', async () => {
      // Documents current behavior: the router never checks input.userId === ctx.userId.
      vi.mocked(organizationService.getUserOrganizations).mockResolvedValue([] as never);

      const caller = await authedCaller();
      await caller.organizations.getUserOrganizations({ userId: otherUserId });

      expect(organizationService.getUserOrganizations).toHaveBeenCalledWith(
        expect.objectContaining({ userId: otherUserId })
      );
    });

    it('rejects a non-uuid userId', async () => {
      const caller = await authedCaller();

      await expectTRPCError(
        caller.organizations.getUserOrganizations({ userId: 'nope' }),
        'BAD_REQUEST',
        'Invalid user ID'
      );
      expect(organizationService.getUserOrganizations).not.toHaveBeenCalled();
    });
  });

  describe('getOrganization / getOrganizationBySlug', () => {
    it('returns an organization by id', async () => {
      vi.mocked(organizationService.getOrganizationById).mockResolvedValue(
        mockOrganization as never
      );

      const caller = await authedCaller();

      await expect(caller.organizations.getOrganization({ organizationId })).resolves.toEqual(
        mockOrganization
      );
    });

    it('returns an organization by slug', async () => {
      vi.mocked(organizationService.getOrganizationBySlug).mockResolvedValue(
        mockOrganization as never
      );

      const caller = await authedCaller();
      const result = await caller.organizations.getOrganizationBySlug({
        organizationSlug: 'acme',
      });

      expect(result).toEqual(mockOrganization);
      expect(organizationService.getOrganizationBySlug).toHaveBeenCalledWith({
        slug: 'acme',
        headers: expect.any(Headers),
      });
    });

    it('maps an unknown slug to NOT_FOUND', async () => {
      vi.mocked(organizationService.getOrganizationBySlug).mockRejectedValue(
        new Error('Organization ghost not found', { cause: ERRORS.NOT_FOUND })
      );

      const caller = await authedCaller();

      await expectTRPCError(
        caller.organizations.getOrganizationBySlug({ organizationSlug: 'ghost' }),
        'NOT_FOUND',
        'Organization ghost not found'
      );
    });

    it('rejects an empty slug', async () => {
      const caller = await authedCaller();

      await expectTRPCError(
        caller.organizations.getOrganizationBySlug({ organizationSlug: '' }),
        'BAD_REQUEST',
        'Organization slug is required'
      );
    });
  });

  describe('createOrganization', () => {
    it('creates an organization from a name only', async () => {
      vi.mocked(organizationService.createOrganization).mockResolvedValue(
        mockOrganization as never
      );

      const caller = await authedCaller();
      const result = await caller.organizations.createOrganization({ name: 'Acme' });

      expect(result).toEqual(mockOrganization);
      expect(organizationService.createOrganization).toHaveBeenCalledWith({
        name: 'Acme',
        headers: expect.any(Headers),
      });
    });

    it('rejects a name longer than 100 characters', async () => {
      const caller = await authedCaller();

      await expectTRPCError(
        caller.organizations.createOrganization({ name: 'x'.repeat(101) }),
        'BAD_REQUEST',
        'Name too long'
      );
      expect(organizationService.createOrganization).not.toHaveBeenCalled();
    });

    it('maps a creation failure to BAD_REQUEST', async () => {
      vi.mocked(organizationService.createOrganization).mockRejectedValue(
        new Error('Slug already taken', { cause: ERRORS.BAD_REQUEST })
      );

      const caller = await authedCaller();

      await expectTRPCError(
        caller.organizations.createOrganization({ name: 'Acme' }),
        'BAD_REQUEST',
        'Slug already taken'
      );
    });
  });

  describe('updateOrganization', () => {
    it('splits the organization id out of the update payload', async () => {
      vi.mocked(organizationService.updateOrganization).mockResolvedValue(
        mockOrganization as never
      );

      const caller = await authedCaller();
      await caller.organizations.updateOrganization({ organizationId, name: 'Acme Inc' });

      expect(organizationService.updateOrganization).toHaveBeenCalledWith({
        organizationId,
        data: { name: 'Acme Inc' },
        headers: expect.any(Headers),
      });
    });

    it('rejects a non-uuid organization id', async () => {
      const caller = await authedCaller();

      await expectTRPCError(
        caller.organizations.updateOrganization({ organizationId: 'nope', name: 'Acme' }),
        'BAD_REQUEST',
        'Invalid organization ID'
      );
      expect(organizationService.updateOrganization).not.toHaveBeenCalled();
    });
  });

  describe('organization logo', () => {
    it('forwards the upload payload together with the request headers', async () => {
      vi.mocked(organizationService.uploadOrganizationLogo).mockResolvedValue({
        success: true,
        message: 'Organization logo uploaded successfully',
      });

      const caller = await authedCaller();
      await caller.organizations.uploadOrganizationLogo({
        fileBase64: 'data:image/png;base64,aGVsbG8=',
        fileName: 'logo.png',
        mimeType: 'image/png',
      });

      expect(organizationService.uploadOrganizationLogo).toHaveBeenCalledWith({
        fileBase64: 'data:image/png;base64,aGVsbG8=',
        fileName: 'logo.png',
        mimeType: 'image/png',
        headers: expect.any(Headers),
      });
    });

    it('rejects an unsupported logo mime type', async () => {
      const caller = await authedCaller();

      await expectTRPCError(
        caller.organizations.uploadOrganizationLogo({
          fileBase64: 'data:image/gif;base64,aGVsbG8=',
          fileName: 'logo.gif',
          // @ts-expect-error - deliberately unsupported mime type
          mimeType: 'image/gif',
        }),
        'BAD_REQUEST'
      );
      expect(organizationService.uploadOrganizationLogo).not.toHaveBeenCalled();
    });

    it('deletes the logo of the active organization without taking any input', async () => {
      vi.mocked(organizationService.deleteOrganizationLogo).mockResolvedValue({
        success: true,
        message: 'Organization logo deleted successfully',
      });

      const caller = await authedCaller();
      const result = await caller.organizations.deleteOrganizationLogo();

      expect(result.success).toBe(true);
      expect(organizationService.deleteOrganizationLogo).toHaveBeenCalledWith({
        headers: expect.any(Headers),
      });
    });

    it('rejects an unauthenticated logo delete', async () => {
      const caller = await anonCaller();

      await expectTRPCError(caller.organizations.deleteOrganizationLogo(), 'UNAUTHORIZED');
      expect(organizationService.deleteOrganizationLogo).not.toHaveBeenCalled();
    });
  });

  describe('getOrgMembers', () => {
    it('returns the member list for an organization', async () => {
      const members = { members: [{ id: memberId, role: 'owner' }], total: 1 };
      vi.mocked(memberService.getOrganizationMembers).mockResolvedValue(members as never);

      const caller = await authedCaller();
      const result = await caller.organizations.getOrgMembers({ organizationId });

      expect(result).toEqual(members);
      expect(memberService.getOrganizationMembers).toHaveBeenCalledWith({
        organizationId,
        headers: expect.any(Headers),
      });
    });

    it('accepts the default offset but rejects the same value passed explicitly', async () => {
      // `offset: z.number().int().positive().default(0)` - the default bypasses validation
      // while an explicit 0 fails `positive()`. Documents current behavior.
      vi.mocked(memberService.getOrganizationMembers).mockResolvedValue({ members: [] } as never);

      const caller = await authedCaller();

      await expect(caller.organizations.getOrgMembers({ organizationId })).resolves.toBeDefined();
      await expectTRPCError(
        caller.organizations.getOrgMembers({ organizationId, offset: 0 }),
        'BAD_REQUEST'
      );
    });

    it('rejects an unknown sort direction', async () => {
      const caller = await authedCaller();

      await expectTRPCError(
        // @ts-expect-error - deliberately invalid sort direction
        caller.organizations.getOrgMembers({ organizationId, sortDirection: 'sideways' }),
        'BAD_REQUEST'
      );
    });
  });

  describe('inviteMember', () => {
    it('creates an invitation with the requested role', async () => {
      vi.mocked(invitationService.createInvitation).mockResolvedValue({
        id: invitationId,
      } as never);

      const caller = await authedCaller();
      await caller.organizations.inviteMember({
        organizationId,
        email: 'new@example.com',
        role: 'admin',
      });

      expect(invitationService.createInvitation).toHaveBeenCalledWith({
        email: 'new@example.com',
        organizationId,
        role: 'admin',
        headers: expect.any(Headers),
      });
    });

    it('defaults the invited role to member', async () => {
      vi.mocked(invitationService.createInvitation).mockResolvedValue({
        id: invitationId,
      } as never);

      const caller = await authedCaller();
      await caller.organizations.inviteMember({ organizationId, email: 'new@example.com' });

      expect(invitationService.createInvitation).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'member' })
      );
    });

    it('rejects a malformed email address', async () => {
      const caller = await authedCaller();

      await expectTRPCError(
        caller.organizations.inviteMember({ organizationId, email: 'not-an-email' }),
        'BAD_REQUEST',
        'Invalid email address'
      );
      expect(invitationService.createInvitation).not.toHaveBeenCalled();
    });

    it('maps a duplicate invitation to BAD_REQUEST', async () => {
      vi.mocked(invitationService.createInvitation).mockRejectedValue(
        new Error('User already has an invitation to this organization', {
          cause: ERRORS.BAD_REQUEST,
        })
      );

      const caller = await authedCaller();

      await expectTRPCError(
        caller.organizations.inviteMember({ organizationId, email: 'new@example.com' }),
        'BAD_REQUEST',
        'already has an invitation'
      );
    });
  });

  describe('cancelInvitation', () => {
    it('cancels an invitation by id', async () => {
      vi.mocked(invitationService.cancelInvitation).mockResolvedValue({ success: true } as never);

      const caller = await authedCaller();
      const result = await caller.organizations.cancelInvitation({ invitationId });

      expect(result).toEqual({ success: true });
      expect(invitationService.cancelInvitation).toHaveBeenCalledWith({
        invitationId,
        headers: expect.any(Headers),
      });
    });

    it('rejects a non-uuid invitation id', async () => {
      const caller = await authedCaller();

      await expectTRPCError(
        caller.organizations.cancelInvitation({ invitationId: 'nope' }),
        'BAD_REQUEST',
        'Invalid invitation ID'
      );
    });
  });

  describe('removeMember', () => {
    it('removes a member by id or email', async () => {
      vi.mocked(memberService.removeMember).mockResolvedValue({
        success: true,
        message: 'Member removed',
      });

      const caller = await authedCaller();
      await caller.organizations.removeMember({
        organizationId,
        memberIdOrEmail: 'member@example.com',
      });

      expect(memberService.removeMember).toHaveBeenCalledWith({
        organizationId,
        memberIdOrEmail: 'member@example.com',
        headers: expect.any(Headers),
      });
    });

    it('rejects an empty member identifier', async () => {
      const caller = await authedCaller();

      await expectTRPCError(
        caller.organizations.removeMember({ organizationId, memberIdOrEmail: '' }),
        'BAD_REQUEST',
        'User ID or email is required'
      );
      expect(memberService.removeMember).not.toHaveBeenCalled();
    });

    it('surfaces a FORBIDDEN raised by the service', async () => {
      vi.mocked(memberService.removeMember).mockRejectedValue(
        new Error('Only owners and admins can remove members', { cause: ERRORS.FORBIDDEN })
      );

      const caller = await authedCaller();

      await expectTRPCError(
        caller.organizations.removeMember({ organizationId, memberIdOrEmail: memberId }),
        'FORBIDDEN'
      );
    });
  });

  describe('updateMemberRole', () => {
    it('updates a member role', async () => {
      vi.mocked(memberService.updateMemberRole).mockResolvedValue({
        success: true,
        message: 'Role updated',
      });

      const caller = await authedCaller();
      const result = await caller.organizations.updateMemberRole({
        organizationId,
        memberId,
        role: 'owner',
      });

      expect(result.success).toBe(true);
      expect(memberService.updateMemberRole).toHaveBeenCalledWith({
        organizationId,
        memberId,
        role: 'owner',
        headers: expect.any(Headers),
      });
    });

    it('rejects a role outside the organization role enum', async () => {
      const caller = await authedCaller();

      await expectTRPCError(
        // @ts-expect-error - deliberately invalid role
        caller.organizations.updateMemberRole({ organizationId, memberId, role: 'superuser' }),
        'BAD_REQUEST'
      );
      expect(memberService.updateMemberRole).not.toHaveBeenCalled();
    });
  });

  describe('leaveOrganization', () => {
    it('leaves using the session user, not a user id from the input', async () => {
      vi.mocked(memberService.leaveOrganization).mockResolvedValue({
        success: true,
        message: 'Left organization',
      });

      const caller = await authedCaller();
      await caller.organizations.leaveOrganization({
        organizationId,
        // @ts-expect-error - a hostile client trying to make someone else leave
        userId: otherUserId,
      });

      expect(memberService.leaveOrganization).toHaveBeenCalledWith({
        organizationId,
        userId,
        headers: expect.any(Headers),
      });
    });

    it('surfaces a FORBIDDEN raised when the sole owner tries to leave', async () => {
      vi.mocked(memberService.leaveOrganization).mockRejectedValue(
        new Error('The sole owner cannot leave the organization', { cause: ERRORS.FORBIDDEN })
      );

      const caller = await authedCaller();

      await expectTRPCError(
        caller.organizations.leaveOrganization({ organizationId }),
        'FORBIDDEN'
      );
    });
  });

  describe('deleteOrganization', () => {
    it('deletes using the session user as the actor', async () => {
      vi.mocked(organizationService.deleteOrganization).mockResolvedValue({
        success: true,
        message: 'Organization deleted',
      });

      const caller = await authedCaller();
      const result = await caller.organizations.deleteOrganization({ organizationId });

      expect(result.success).toBe(true);
      expect(organizationService.deleteOrganization).toHaveBeenCalledWith({
        organizationId,
        userId,
        headers: expect.any(Headers),
      });
    });

    it('maps a missing organization to NOT_FOUND', async () => {
      vi.mocked(organizationService.deleteOrganization).mockRejectedValue(
        new Error('Organization not found', { cause: ERRORS.NOT_FOUND })
      );

      const caller = await authedCaller();

      await expectTRPCError(
        caller.organizations.deleteOrganization({ organizationId }),
        'NOT_FOUND'
      );
    });

    it('rejects a non-uuid organization id', async () => {
      const caller = await authedCaller();

      await expectTRPCError(
        caller.organizations.deleteOrganization({ organizationId: 'nope' }),
        'BAD_REQUEST',
        'Invalid organization ID'
      );
    });
  });

  describe('checkGoogleApiKey', () => {
    it('reports the key as configured', async () => {
      vi.mocked(configService.isGoogleApiKeyConfigured).mockResolvedValue(true);

      const caller = await authedCaller();

      await expect(caller.organizations.checkGoogleApiKey()).resolves.toEqual({
        configured: true,
      });
    });

    it('reports the key as missing', async () => {
      vi.mocked(configService.isGoogleApiKeyConfigured).mockResolvedValue(false);

      const caller = await authedCaller();

      await expect(caller.organizations.checkGoogleApiKey()).resolves.toEqual({
        configured: false,
      });
    });

    it('does not wrap a config lookup failure in handleApiError', async () => {
      // This procedure has no try/catch, so a service failure escapes as a raw
      // INTERNAL_SERVER_ERROR rather than a mapped error. Documents current behavior.
      vi.mocked(configService.isGoogleApiKeyConfigured).mockRejectedValue(
        new Error('config table unavailable', { cause: ERRORS.NOT_FOUND })
      );

      const caller = await authedCaller();

      await expectTRPCError(caller.organizations.checkGoogleApiKey(), 'INTERNAL_SERVER_ERROR');
    });
  });
});
