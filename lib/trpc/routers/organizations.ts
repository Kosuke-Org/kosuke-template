/**
 * tRPC router for organization operations
 * Handles organization CRUD, member management, and invitations
 */

import { eq, and } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { clerkClient } from '@clerk/nextjs/server';
import { db } from '@/lib/db/drizzle';
import { organizations, orgMemberships, users } from '@/lib/db/schema';
import { router, protectedProcedure } from '../init';
import { uploadProfileImage, deleteProfileImage } from '@/lib/storage';
import {
  getOrgById,
  getUserOrganizations,
  isUserOrgAdmin,
  generateUniqueOrgSlug,
} from '@/lib/organizations';
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

export const organizationsRouter = router({
  /**
   * Get all organizations the current user belongs to
   */
  getUserOrganizations: protectedProcedure.query(async ({ ctx }) => {
    const orgs = await getUserOrganizations(ctx.userId);

    return orgs.map((org) => ({
      id: org.id,
      clerkOrgId: org.clerkOrgId,
      name: org.name,
      slug: org.slug,
      logoUrl: org.logoUrl,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    }));
  }),

  /**
   * Get a single organization by ID
   */
  getOrganization: protectedProcedure.input(getOrganizationSchema).query(async ({ ctx, input }) => {
    const org = await getOrgById(input.organizationId);

    if (!org) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
    }

    // Verify user is a member
    const [membership] = await db
      .select()
      .from(orgMemberships)
      .where(
        and(eq(orgMemberships.organizationId, org.id), eq(orgMemberships.clerkUserId, ctx.userId))
      )
      .limit(1);

    if (!membership) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You are not a member of this organization',
      });
    }

    return {
      id: org.id,
      clerkOrgId: org.clerkOrgId,
      name: org.name,
      slug: org.slug,
      logoUrl: org.logoUrl,
      settings: org.settings,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
      userRole: membership.role,
    };
  }),

  /**
   * Create a new organization
   */
  createOrganization: protectedProcedure
    .input(createOrganizationSchema)
    .mutation(async ({ ctx, input }) => {
      const clerk = await clerkClient();

      // Generate unique slug
      const slug = input.slug || (await generateUniqueOrgSlug(input.name));

      // Create organization in Clerk
      const clerkOrg = await clerk.organizations.createOrganization({
        name: input.name,
        slug,
        createdBy: ctx.userId,
      });

      // Immediately sync to local database instead of waiting for webhook
      // This ensures the organization is available right away
      const { syncOrganizationFromClerk } = await import('@/lib/organizations');
      const localOrg = await syncOrganizationFromClerk(clerkOrg.id);

      console.log('✅ Organization synced to local database:', localOrg.id);

      // Also sync the creator's membership immediately
      // Clerk automatically adds the creator as admin when org is created
      try {
        const memberships = await clerk.organizations.getOrganizationMembershipList({
          organizationId: clerkOrg.id,
        });

        // Find the creator's membership and sync it
        const creatorMembership = memberships.data.find(
          (m) => m.publicUserData?.userId === ctx.userId
        );

        if (creatorMembership) {
          const { syncMembershipFromClerk } = await import('@/lib/organizations');
          await syncMembershipFromClerk(creatorMembership.id);
          console.log('✅ Creator membership synced to local database');
        }
      } catch (error) {
        console.error('⚠️ Error syncing creator membership:', error);
        // Don't fail the entire operation if membership sync fails
        // The webhook will handle it as a fallback
      }

      // The webhooks serve as a backup reconciliation mechanism
      return {
        success: true,
        clerkOrgId: clerkOrg.id,
        slug: clerkOrg.slug || slug,
        organizationId: localOrg.id,
        message: 'Organization created successfully',
      };
    }),

  /**
   * Update organization details
   */
  updateOrganization: protectedProcedure
    .input(updateOrganizationSchema)
    .mutation(async ({ ctx, input }) => {
      const { organizationId, ...data } = input;

      const org = await getOrgById(organizationId);

      if (!org) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
      }

      // Verify user is admin
      const isAdmin = await isUserOrgAdmin(ctx.userId, org.id);
      if (!isAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only organization admins can update organization details',
        });
      }

      const clerk = await clerkClient();
      const updateData = data as Parameters<typeof clerk.organizations.updateOrganization>[1];
      await clerk.organizations.updateOrganization(org.clerkOrgId, updateData);

      // The webhook will handle syncing name changes
      return {
        success: true,
        message: 'Organization updated successfully',
      };
    }),

  /**
   * Upload organization logo
   */
  uploadOrganizationLogo: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().uuid(),
        fileBase64: z.string(),
        fileName: z.string(),
        mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
      })
    )
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
          message: 'Only organization admins can update the logo',
        });
      }

      // Delete old logo if exists
      if (org.logoUrl) {
        try {
          await deleteProfileImage(org.logoUrl);
        } catch (error) {
          console.error('Error deleting old logo:', error);
          // Continue even if deletion fails
        }
      }

      // Convert base64 to buffer
      const base64Data = input.fileBase64.split(',')[1] || input.fileBase64;
      const buffer = Buffer.from(base64Data, 'base64');

      // Validate file size (max 2MB)
      if (buffer.length > 2 * 1024 * 1024) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'File size must be less than 2MB',
        });
      }

      // Create File object from buffer
      const file = new File([buffer], input.fileName, { type: input.mimeType });

      // Upload to Vercel Blob
      const logoUrl = await uploadProfileImage(file, org.id);

      // Update database
      await db
        .update(organizations)
        .set({
          logoUrl,
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, org.id));

      // Update Clerk organization metadata (store custom logo URL)
      const clerk = await clerkClient();
      const clerkOrg = await clerk.organizations.getOrganization({
        organizationId: org.clerkOrgId,
      });

      await clerk.organizations.updateOrganization(org.clerkOrgId, {
        publicMetadata: {
          ...clerkOrg.publicMetadata,
          customLogoUrl: logoUrl,
        },
      });

      return {
        success: true,
        logoUrl,
        message: 'Organization logo uploaded successfully',
      };
    }),

  /**
   * Delete organization logo
   */
  deleteOrganizationLogo: protectedProcedure
    .input(getOrganizationSchema)
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
          message: 'Only organization admins can delete the logo',
        });
      }

      if (!org.logoUrl) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No logo to delete',
        });
      }

      // Delete from storage
      await deleteProfileImage(org.logoUrl);

      // Update database
      await db
        .update(organizations)
        .set({
          logoUrl: null,
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, org.id));

      // Remove from Clerk organization metadata
      const clerk = await clerkClient();
      const clerkOrg = await clerk.organizations.getOrganization({
        organizationId: org.clerkOrgId,
      });

      // Remove customLogoUrl from metadata
      const metadata = clerkOrg.publicMetadata || {};
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { customLogoUrl, ...remainingMetadata } = metadata as Record<string, unknown> & {
        customLogoUrl?: string;
      };

      await clerk.organizations.updateOrganization(org.clerkOrgId, {
        publicMetadata: remainingMetadata,
      });

      return {
        success: true,
        message: 'Organization logo deleted successfully',
      };
    }),

  /**
   * Get organization members with user details
   */
  getOrgMembers: protectedProcedure.input(getOrgMembersSchema).query(async ({ ctx, input }) => {
    const org = await getOrgById(input.organizationId);

    if (!org) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found' });
    }

    // Verify user is a member
    const [membership] = await db
      .select()
      .from(orgMemberships)
      .where(
        and(eq(orgMemberships.organizationId, org.id), eq(orgMemberships.clerkUserId, ctx.userId))
      )
      .limit(1);

    if (!membership) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You are not a member of this organization',
      });
    }

    // Get all members with user details
    const members = await db
      .select({
        membershipId: orgMemberships.id,
        role: orgMemberships.role,
        joinedAt: orgMemberships.joinedAt,
        userId: users.clerkUserId,
        email: users.email,
        displayName: users.displayName,
        profileImageUrl: users.profileImageUrl,
      })
      .from(orgMemberships)
      .innerJoin(users, eq(orgMemberships.clerkUserId, users.clerkUserId))
      .where(eq(orgMemberships.organizationId, org.id));

    return members;
  }),

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
    await clerk.organizations.createOrganizationInvitation({
      organizationId: org.clerkOrgId,
      emailAddress: input.email,
      role: input.role,
      inviterUserId: ctx.userId,
      redirectUrl: `${appUrl}/org/${org.slug}/dashboard`,
    });

    return {
      success: true,
      message: `Invitation sent to ${input.email}`,
    };
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
      organizationId: org.clerkOrgId,
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
        organizationId: org.clerkOrgId,
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
