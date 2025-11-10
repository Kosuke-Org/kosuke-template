/**
 * tRPC router for organization operations
 * Handles organization CRUD, member management, and invitations
 */

import { eq, and } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { clerkClient } from '@clerk/nextjs/server';
import { db } from '@/lib/db/drizzle';
import { orgMemberships } from '@/lib/db/schema';
import { router, protectedProcedure } from '../init';
import { uploadProfileImage, deleteProfileImage } from '@/lib/storage';
import { getOrgById, isUserOrgAdmin, generateUniqueOrgSlug } from '@/lib/organizations';
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  getOrganizationSchema,
  inviteMemberSchema,
  removeMemberSchema,
  updateMemberRoleSchema,
  getOrgMembersSchema,
} from '../schemas/organizations';
import { z } from 'zod';
import { isClerkAPIResponseError } from '@/lib/utils';
import { auth } from '@/lib/auth/providers';
import { headers } from 'next/headers';

export const organizationsRouter = router({
  /**
   * Get all organizations the current user belongs to
   */
  getUserOrganizations: protectedProcedure.query(async () => {
    const result = await auth.api.listOrganizations({
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

        if (role !== 'admin' && role !== 'owner') {
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

    if (role !== 'admin' && role !== 'owner') {
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

  // TODO: Refactor members

  /**
   * Invite a member to the organization
   */
  inviteMember: protectedProcedure.input(inviteMemberSchema).mutation(async ({ ctx, input }) => {
    const org = await getOrgById(input.organizationId);

    if (!org) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
    }

    // Verify user is admin
    const isAdmin = await isUserOrgAdmin(ctx.userId, org.id);
    if (!isAdmin) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only organization admins can invite members',
      });
    }

    const clerk = await clerkClient();

    // Create invitation in Clerk with redirect URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    try {
      await clerk.organizations.createOrganizationInvitation({
        organizationId: org.id,
        emailAddress: input.email,
        role: input.role,
        inviterUserId: ctx.userId,
        // we redirect to sign-in because Clerk's components handle the sign-in and sign-up for new users
        redirectUrl: `${appUrl}/sign-in`,
      });

      return {
        success: true,
        message: `Invitation sent to ${input.email}`,
      };
    } catch (error) {
      if (isClerkAPIResponseError(error)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.errors?.[0]?.message || error.message,
        });
      }

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create organization invitation',
      });
    }
  }),

  /**
   * Remove a member from the organization
   */
  removeMember: protectedProcedure.input(removeMemberSchema).mutation(async ({ ctx, input }) => {
    const org = await getOrgById(input.organizationId);

    if (!org) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
    }

    // Verify user is admin
    const isAdmin = await isUserOrgAdmin(ctx.userId, org.id);
    if (!isAdmin) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only organization admins can remove members',
      });
    }

    // Don't allow removing yourself if you're the only admin
    if (input.clerkUserId === ctx.userId) {
      const admins = await db
        .select()
        .from(orgMemberships)
        .where(
          and(eq(orgMemberships.organizationId, org.id), eq(orgMemberships.role, 'org:admin'))
        );

      if (admins.length === 1) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot remove yourself as the only admin',
        });
      }
    }

    // Get the membership
    const [membership] = await db
      .select()
      .from(orgMemberships)
      .where(
        and(
          eq(orgMemberships.organizationId, org.id),
          eq(orgMemberships.clerkUserId, input.clerkUserId)
        )
      )
      .limit(1);

    if (!membership) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Member not found in this organization',
      });
    }

    const clerk = await clerkClient();

    // Delete membership in Clerk
    await clerk.organizations.deleteOrganizationMembership({
      organizationId: org.id,
      userId: input.clerkUserId,
    });

    // The webhook will handle removing from our database
    return {
      success: true,
      message: 'Member removed successfully',
    };
  }),

  /**
   * Update a member's role
   */
  updateMemberRole: protectedProcedure
    .input(updateMemberRoleSchema)
    .mutation(async ({ ctx, input }) => {
      const org = await getOrgById(input.organizationId);

      if (!org) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
      }

      // Verify user is admin
      const isAdmin = await isUserOrgAdmin(ctx.userId, org.id);
      if (!isAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only organization admins can update member roles',
        });
      }

      // Don't allow changing your own role if you're the only admin
      if (input.clerkUserId === ctx.userId && input.role === 'org:member') {
        const admins = await db
          .select()
          .from(orgMemberships)
          .where(
            and(eq(orgMemberships.organizationId, org.id), eq(orgMemberships.role, 'org:admin'))
          );

        if (admins.length === 1) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot demote yourself as the only admin',
          });
        }
      }

      // Get the membership
      const [membership] = await db
        .select()
        .from(orgMemberships)
        .where(
          and(
            eq(orgMemberships.organizationId, org.id),
            eq(orgMemberships.clerkUserId, input.clerkUserId)
          )
        )
        .limit(1);

      if (!membership) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Member not found in this organization',
        });
      }

      const clerk = await clerkClient();

      // Update role in Clerk
      await clerk.organizations.updateOrganizationMembership({
        organizationId: org.id,
        userId: input.clerkUserId,
        role: input.role,
      });

      // The webhook will handle updating our database
      return {
        success: true,
        message: 'Member role updated successfully',
      };
    }),
});
