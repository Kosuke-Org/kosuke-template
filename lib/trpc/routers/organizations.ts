/**
 * tRPC router for organization operations
 * Handles organization CRUD, member management, and invitations
 */
import { headers } from 'next/headers';

import { TRPCError } from '@trpc/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { auth } from '@/lib/auth/providers';
import { db } from '@/lib/db';
import { invitations } from '@/lib/db/schema';
import { generateUniqueOrgSlug, switchToNextOrganization } from '@/lib/organizations';
import { deleteProfileImage, uploadProfileImage } from '@/lib/storage';
import { ORG_ROLES } from '@/lib/types/organization';

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
} from '../schemas/organizations';

export const organizationsRouter = router({
  /**
   * Get all organizations the current user belongs to
   */
  getUserOrganizations: protectedProcedure
    .input(getUserOrganizationsSchema)
    .query(async ({ input }) => {
      const result = await auth.api.listOrganizations({
        query: {
          userId: input.userId,
        },
        headers: await headers(),
      });

      return result;
    }),

  /**
   * Get a single organization by ID
   */
  getOrganization: protectedProcedure.input(getOrganizationSchema).query(async ({ input }) => {
    const result = await auth.api.getFullOrganization({
      query: {
        organizationId: input.organizationId,
        membersLimit: 100,
      },
      headers: await headers(),
    });

    return result;
  }),

  /**
   * Get a single organization by slug
   */
  getOrganizationBySlug: protectedProcedure
    .input(getOrganizationBySlugSchema)
    .query(async ({ input }) => {
      try {
        const result = await auth.api.getFullOrganization({
          query: {
            organizationSlug: input.organizationSlug,
          },
          headers: await headers(),
        });

        return result;
      } catch {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Organization ${input.organizationSlug} not found`,
        });
      }
    }),
  /**
   * Create a new organization
   */
  createOrganization: protectedProcedure
    .input(createOrganizationSchema)
    .mutation(async ({ input }) => {
      const slug = await generateUniqueOrgSlug(input.name);

      try {
        const result = await auth.api.createOrganization({
          body: {
            name: input.name,
            slug,
            keepCurrentActiveOrganization: false,
          },
          headers: await headers(),
        });

        // Explicitly set the active organization to refresh the cookie cache
        // This ensures the session cookie is updated with the new organization
        if (result?.id) {
          await auth.api.setActiveOrganization({
            body: {
              organizationId: result.id,
            },
            headers: await headers(),
          });
        }

        return result;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create organization',
        });
      }
    }),

  /**
   * Update organization details
   */
  updateOrganization: protectedProcedure
    .input(updateOrganizationSchema)
    .mutation(async ({ input }) => {
      try {
        const result = await auth.api.updateOrganization({
          body: {
            data: {
              name: input.name,
              slug: input.slug,
              metadata: input.metadata,
            },
            organizationId: input.organizationId,
          },
          headers: await headers(),
        });

        return result;
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update organization',
        });
      }
    }),

  /**
   * Upload organization logo
   */
  uploadOrganizationLogo: protectedProcedure
    .input(
      z.object({
        fileBase64: z.string(),
        fileName: z.string(),
        mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { role } = await auth.api.getActiveMemberRole({
          headers: await headers(),
        });

        if (role !== ORG_ROLES.ADMIN && role !== ORG_ROLES.OWNER) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only organization admins and owners can upload the logo',
          });
        }

        const organization = await auth.api.getFullOrganization({
          headers: await headers(),
        });

        if (!organization?.id) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Organization not found',
          });
        }

        const base64Data = input.fileBase64.split(',')[1] || input.fileBase64;
        const buffer = Buffer.from(base64Data, 'base64');

        if (buffer.length > 2 * 1024 * 1024) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'File size must be less than 2MB',
          });
        }

        const file = new File([buffer], input.fileName, { type: input.mimeType });
        const logoUrl = await uploadProfileImage(file, organization.id);

        await auth.api.updateOrganization({
          body: {
            data: {
              logo: logoUrl,
            },
            organizationId: organization.id,
          },
          headers: await headers(),
        });

        return {
          success: true,
          message: 'Organization logo uploaded successfully',
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update organization',
        });
      }
    }),

  /**
   * Delete organization logo
   */
  deleteOrganizationLogo: protectedProcedure.mutation(async () => {
    const { role } = await auth.api.getActiveMemberRole({
      headers: await headers(),
    });

    if (role !== ORG_ROLES.ADMIN && role !== ORG_ROLES.OWNER) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only organization admins and owners can delete the logo',
      });
    }

    const organization = await auth.api.getFullOrganization({
      headers: await headers(),
    });

    if (!organization?.logo) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Organization logo not found',
      });
    }

    await deleteProfileImage(organization.logo);

    await auth.api.updateOrganization({
      body: {
        data: {
          logo: '',
        },
      },
      headers: await headers(),
    });

    return {
      success: true,
      message: 'Organization logo deleted successfully',
    };
  }),

  /**
   * Get organization members with user details
   */
  getOrgMembers: protectedProcedure.input(getOrgMembersSchema).query(async ({ input }) => {
    const result = await auth.api.listMembers({
      query: {
        organizationId: input.organizationId,
      },
      headers: await headers(),
    });

    return result;
  }),

  /**
   * Invite a member to the organization
   */
  inviteMember: protectedProcedure.input(createInvitationSchema).mutation(async ({ input }) => {
    const { role, email, organizationId } = input;
    const pendingInvitations = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.email, email),
          eq(invitations.organizationId, organizationId),
          eq(invitations.status, 'pending')
        )
      );

    if (pendingInvitations.length) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'User already has an invitation to this organization',
      });
    }

    await auth.api.createInvitation({
      body: {
        email,
        role,
        organizationId,
        resend: true,
      },
      headers: await headers(),
    });

    return {
      success: true,
      message: 'Member invited successfully',
    };
  }),

  cancelInvitation: protectedProcedure.input(cancelInvitationSchema).mutation(async ({ input }) => {
    await auth.api.cancelInvitation({
      body: {
        invitationId: input.invitationId,
      },
      headers: await headers(),
    });

    return {
      success: true,
      message: 'Invitation cancelled successfully',
    };
  }),

  /**
   * Remove a member from the organization
   */
  removeMember: protectedProcedure.input(removeMemberSchema).mutation(async ({ input }) => {
    const { memberIdOrEmail, organizationId } = input;

    await auth.api.removeMember({
      body: {
        memberIdOrEmail,
        organizationId: organizationId,
      },
      headers: await headers(),
    });

    return {
      success: true,
      message: 'Member removed successfully',
    };
  }),

  /**
   * Update a member's role
   */
  updateMemberRole: protectedProcedure.input(updateMemberRoleSchema).mutation(async ({ input }) => {
    const { role, memberId, organizationId } = input;

    await auth.api.updateMemberRole({
      body: {
        role,
        memberId,
        organizationId,
      },
      headers: await headers(),
    });

    return {
      success: true,
      message: 'Member role updated successfully',
    };
  }),

  leaveOrganization: protectedProcedure
    .input(leaveOrganizationSchema)
    .mutation(async ({ input, ctx }) => {
      await auth.api.leaveOrganization({
        body: {
          organizationId: input.organizationId,
        },
        headers: await headers(),
      });

      // Switch to another organization or set active to null if none remain
      await switchToNextOrganization(ctx.userId);

      return {
        success: true,
        message: 'You have left the organization',
      };
    }),

  /**
   * Delete organization (owner only)
   */
  deleteOrganization: protectedProcedure
    .input(deleteOrganizationSchema)
    .mutation(async ({ input, ctx }) => {
      const { role } = await auth.api.getActiveMemberRole({
        headers: await headers(),
      });

      if (role !== ORG_ROLES.OWNER) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only organization owners can delete the organization',
        });
      }

      const organization = await auth.api.getFullOrganization({
        query: {
          organizationId: input.organizationId,
        },
        headers: await headers(),
      });

      if (!organization) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Organization not found',
        });
      }

      // Delete organization logo if it exists
      if (organization.logo) {
        await deleteProfileImage(organization.logo);
      }

      // Delete the organization
      await auth.api.deleteOrganization({
        body: {
          organizationId: input.organizationId,
        },
        headers: await headers(),
      });

      // Switch to another organization or set active to null if none remain
      await switchToNextOrganization(ctx.userId);

      return {
        success: true,
        message: 'Organization deleted successfully',
      };
    }),

  /**
   * Check if Google AI API key is configured
   * Used to gate AI features (Documents, Assistant) when key is missing
   */
  checkGoogleApiKey: protectedProcedure.query(() => {
    return {
      configured: !!process.env.GOOGLE_AI_API_KEY,
    };
  }),
});
