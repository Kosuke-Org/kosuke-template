/**
 * tRPC router for organization operations
 * Thin validation layer - delegates all business logic to services
 */
import { headers } from 'next/headers';

import * as invitationService from '@/lib/services/invitation-service';
import * as memberService from '@/lib/services/member-service';
import * as organizationService from '@/lib/services/organization-service';
import { handleApiError } from '@/lib/utils';

import { protectedProcedure, router } from '../init';
import {
  cancelInvitationSchema,
  createInvitationSchema,
  createOrganizationSchema,
  deleteOrganizationSchema,
  getOrgMembersSchema,
  getOrganizationBySlugSchema,
  getOrganizationSchema,
  getUserOrganizationsSchema,
  leaveOrganizationSchema,
  removeMemberSchema,
  updateMemberRoleSchema,
  updateOrganizationSchema,
  uploadOrganizationLogoSchema,
} from '../schemas/organizations';

export const organizationsRouter = router({
  /**
   * Get all organizations the current user belongs to
   */
  getUserOrganizations: protectedProcedure
    .input(getUserOrganizationsSchema)
    .query(async ({ input }) => {
      try {
        return await organizationService.getUserOrganizations({
          userId: input.userId,
          headers: await headers(),
        });
      } catch (error) {
        handleApiError(error);
      }
    }),

  /**
   * Get a single organization by ID
   */
  getOrganization: protectedProcedure.input(getOrganizationSchema).query(async ({ input }) => {
    try {
      return await organizationService.getOrganizationById({
        organizationId: input.organizationId,
        headers: await headers(),
      });
    } catch (error) {
      handleApiError(error);
    }
  }),

  /**
   * Get a single organization by slug
   */
  getOrganizationBySlug: protectedProcedure
    .input(getOrganizationBySlugSchema)
    .query(async ({ input }) => {
      try {
        return await organizationService.getOrganizationBySlug({
          slug: input.organizationSlug,
          headers: await headers(),
        });
      } catch (error) {
        handleApiError(error);
      }
    }),

  /**
   * Create a new organization
   */
  createOrganization: protectedProcedure
    .input(createOrganizationSchema)
    .mutation(async ({ input }) => {
      try {
        return await organizationService.createOrganization({
          name: input.name,
          headers: await headers(),
        });
      } catch (error) {
        handleApiError(error);
      }
    }),

  /**
   * Update organization details
   */
  updateOrganization: protectedProcedure
    .input(updateOrganizationSchema)
    .mutation(async ({ input }) => {
      try {
        const { organizationId, ...data } = input;
        return await organizationService.updateOrganization({
          organizationId,
          data,
          headers: await headers(),
        });
      } catch (error) {
        handleApiError(error);
      }
    }),

  /**
   * Upload organization logo
   */
  uploadOrganizationLogo: protectedProcedure
    .input(uploadOrganizationLogoSchema)
    .mutation(async ({ input }) => {
      try {
        return await organizationService.uploadOrganizationLogo({
          ...input,
          headers: await headers(),
        });
      } catch (error) {
        handleApiError(error);
      }
    }),

  /**
   * Delete organization logo
   */
  deleteOrganizationLogo: protectedProcedure.mutation(async () => {
    try {
      return await organizationService.deleteOrganizationLogo({
        headers: await headers(),
      });
    } catch (error) {
      handleApiError(error);
    }
  }),

  /**
   * Get organization members with user details
   */
  getOrgMembers: protectedProcedure.input(getOrgMembersSchema).query(async ({ input }) => {
    try {
      return await memberService.getOrganizationMembers({
        organizationId: input.organizationId,
        headers: await headers(),
      });
    } catch (error) {
      handleApiError(error);
    }
  }),

  /**
   * Invite a member to the organization
   */
  inviteMember: protectedProcedure.input(createInvitationSchema).mutation(async ({ input }) => {
    try {
      return await invitationService.createInvitation({
        email: input.email,
        organizationId: input.organizationId,
        role: input.role,
        headers: await headers(),
      });
    } catch (error) {
      handleApiError(error);
    }
  }),

  /**
   * Cancel an invitation
   */
  cancelInvitation: protectedProcedure.input(cancelInvitationSchema).mutation(async ({ input }) => {
    try {
      return await invitationService.cancelInvitation({
        invitationId: input.invitationId,
        headers: await headers(),
      });
    } catch (error) {
      handleApiError(error);
    }
  }),

  /**
   * Remove a member from the organization
   */
  removeMember: protectedProcedure.input(removeMemberSchema).mutation(async ({ input }) => {
    try {
      return await memberService.removeMember({
        organizationId: input.organizationId,
        memberIdOrEmail: input.memberIdOrEmail,
        headers: await headers(),
      });
    } catch (error) {
      handleApiError(error);
    }
  }),

  /**
   * Update a member's role
   */
  updateMemberRole: protectedProcedure.input(updateMemberRoleSchema).mutation(async ({ input }) => {
    try {
      return await memberService.updateMemberRole({
        organizationId: input.organizationId,
        memberId: input.memberId,
        role: input.role,
        headers: await headers(),
      });
    } catch (error) {
      handleApiError(error);
    }
  }),

  /**
   * Leave organization
   */
  leaveOrganization: protectedProcedure
    .input(leaveOrganizationSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        return await memberService.leaveOrganization({
          organizationId: input.organizationId,
          userId: ctx.userId,
          headers: await headers(),
        });
      } catch (error) {
        handleApiError(error);
      }
    }),

  /**
   * Delete organization (owner only)
   */
  deleteOrganization: protectedProcedure
    .input(deleteOrganizationSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        return await organizationService.deleteOrganization({
          organizationId: input.organizationId,
          userId: ctx.userId,
          headers: await headers(),
        });
      } catch (error) {
        handleApiError(error);
      }
    }),

  /**
   * Check if Google AI API key is configured
   * Used to gate AI features (Documents, Assistant) when key is missing
   */
  checkGoogleApiKey: protectedProcedure.query(() => {
    return {
      configured: organizationService.isGoogleApiKeyConfigured(),
    };
  }),
});
