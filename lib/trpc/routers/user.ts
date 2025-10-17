/**
 * tRPC router for user operations
 * Handles user settings and profile management
 */

import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { clerkClient } from '@clerk/nextjs/server';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { router, protectedProcedure } from '../init';
import { uploadProfileImage, deleteProfileImage } from '@/lib/storage';
import { syncUserFromClerk } from '@/lib/auth';
import {
  notificationSettingsSchema,
  uploadProfileImageSchema,
  updateDisplayNameSchema,
  updateUserPublicMetadataSchema,
} from '../schemas/user';
import { AUTH_ERRORS } from '@/lib/auth/constants';

export const userRouter = router({
  /**
   * Get user's notification settings
   */
  getNotificationSettings: protectedProcedure.query(async ({ ctx }) => {
    const user = await db
      .select({ notificationSettings: users.notificationSettings })
      .from(users)
      .where(eq(users.clerkUserId, ctx.userId))
      .limit(1);

    if (!user.length) {
      throw new TRPCError({ code: 'NOT_FOUND', message: AUTH_ERRORS.USER_NOT_FOUND });
    }

    const defaultSettings = {
      emailNotifications: true,
      marketingEmails: false,
      securityAlerts: true,
    };

    if (!user[0].notificationSettings) {
      return defaultSettings;
    }

    try {
      return JSON.parse(user[0].notificationSettings);
    } catch {
      return defaultSettings;
    }
  }),

  /**
   * Update user's notification settings
   */
  updateNotificationSettings: protectedProcedure
    .input(notificationSettingsSchema)
    .mutation(async ({ input, ctx }) => {
      await db
        .update(users)
        .set({
          notificationSettings: JSON.stringify(input),
          updatedAt: new Date(),
        })
        .where(eq(users.clerkUserId, ctx.userId));

      return input;
    }),

  /**
   * Upload profile image
   */
  uploadProfileImage: protectedProcedure
    .input(uploadProfileImageSchema)
    .mutation(async ({ input, ctx }) => {
      // Validate file size (base64 is ~33% larger)
      const estimatedSize = (input.fileBase64.length * 3) / 4;
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (estimatedSize > maxSize) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'File too large. Please upload an image smaller than 5MB.',
        });
      }

      // Convert base64 to buffer
      const buffer = Buffer.from(input.fileBase64.split(',')[1], 'base64');
      const file = new File([buffer], input.fileName, { type: input.mimeType });

      const user = await ctx.getUser();

      // Delete old image if exists
      if (user?.imageUrl) {
        await deleteProfileImage(user.imageUrl);
      }

      // Upload new image
      const imageUrl = await uploadProfileImage(file, ctx.userId);

      // Update Clerk user metadata
      const clerk = await clerkClient();
      await clerk.users.updateUser(ctx.userId, {
        publicMetadata: {
          ...user?.publicMetadata,
          customProfileImageUrl: imageUrl,
        },
      });

      // Sync to local DB
      const updatedUser = await clerk.users.getUser(ctx.userId);
      await syncUserFromClerk(updatedUser);

      return {
        success: true,
        imageUrl,
        message: 'Profile image updated successfully',
      };
    }),

  /**
   * Delete profile image
   */
  deleteProfileImage: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await ctx.getUser();

    if (!user?.imageUrl) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No profile image to delete',
      });
    }

    await deleteProfileImage(user.imageUrl);

    const clerk = await clerkClient();
    await clerk.users.updateUser(ctx.userId, {
      publicMetadata: {
        ...user?.publicMetadata,
        customProfileImageUrl: null,
      },
    });

    const updatedUser = await clerk.users.getUser(ctx.userId);
    await syncUserFromClerk(updatedUser);

    return {
      success: true,
      message: 'Profile image deleted successfully',
    };
  }),

  /**
   * Update user display name
   */
  updateDisplayName: protectedProcedure
    .input(updateDisplayNameSchema)
    .mutation(async ({ input, ctx }) => {
      const clerk = await clerkClient();

      // Parse the display name into first and last name
      const nameParts = input.displayName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Update user in Clerk
      await clerk.users.updateUser(ctx.userId, {
        firstName,
        lastName,
      });

      // Get updated user data and sync to local DB
      const updatedUser = await clerk.users.getUser(ctx.userId);
      await syncUserFromClerk(updatedUser);

      return {
        success: true,
        displayName: input.displayName,
        message: 'Display name updated successfully',
      };
    }),

  updateUserPublicMetadata: protectedProcedure
    .input(updateUserPublicMetadataSchema)
    .mutation(async ({ input, ctx }) => {
      const clerk = await clerkClient();
      await clerk.users.updateUserMetadata(ctx.userId, input);

      const updatedUser = await clerk.users.getUser(ctx.userId);
      await syncUserFromClerk(updatedUser);

      return {
        success: true,
        message: 'User public metadata updated successfully',
      };
    }),
});
