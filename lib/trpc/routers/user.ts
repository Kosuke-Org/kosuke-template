/**
 * tRPC router for user operations
 * Handles user settings and profile management
 * Uses service layer for business logic and data access
 */
import { headers } from 'next/headers';

import { TRPCError } from '@trpc/server';

import { AUTH_ERRORS } from '@/lib/auth/constants';
import { auth } from '@/lib/auth/providers';
import {
  ERRORS,
  deleteUserProfileImage,
  getNotificationSettings,
  getUserById,
  isUserAdmin,
  updateDisplayName,
  updateNotificationSettings,
} from '@/lib/services';
import { syncMarketingPreference } from '@/lib/services/notification-service';
import { deleteProfileImage, uploadProfileImage } from '@/lib/storage';

import { protectedProcedure, router } from '../init';
import {
  getUserSchema,
  notificationSettingsSchema,
  updateDisplayNameSchema,
  uploadProfileImageSchema,
} from '../schemas/user';

export const userRouter = router({
  /**
   * Get current user from database
   */
  getUser: protectedProcedure.input(getUserSchema).query(async ({ input }) => {
    const user = await getUserById(input.userId);

    if (!user) {
      throw new TRPCError({ code: 'NOT_FOUND', message: AUTH_ERRORS.USER_NOT_FOUND });
    }

    return user;
  }),

  /**
   * Get user's notification settings
   */
  getNotificationSettings: protectedProcedure.query(async ({ ctx }) => {
    return await getNotificationSettings(ctx.userId);
  }),

  /**
   * Update user's notification settings
   */
  updateNotificationSettings: protectedProcedure
    .input(notificationSettingsSchema)
    .mutation(async ({ input, ctx }) => {
      // Update settings and get old/new values
      const { oldSettings, newSettings, userEmail } = await updateNotificationSettings(
        ctx.userId,
        input
      );

      // Handle side effects (e.g., Resend audience sync)
      // This is our "signal-like" behavior
      await syncMarketingPreference(userEmail, oldSettings, newSettings);

      return newSettings;
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
      if (user?.image) {
        await deleteProfileImage(user.image);
      }

      // Upload new image
      const imageUrl = await uploadProfileImage(file, ctx.userId);

      await auth.api.updateUser({
        body: {
          image: imageUrl,
        },
        headers: await headers(),
      });

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
    try {
      const imageUrl = await deleteUserProfileImage(ctx.userId);

      await deleteProfileImage(imageUrl);

      return {
        success: true,
        message: 'Profile image deleted successfully',
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new TRPCError({
          code: error.cause === ERRORS.NOT_FOUND ? 'NOT_FOUND' : 'BAD_REQUEST',
          message: error.message,
        });
      }
      throw error;
    }
  }),

  /**
   * Update user display name
   */
  updateDisplayName: protectedProcedure
    .input(updateDisplayNameSchema)
    .mutation(async ({ input, ctx }) => {
      const { displayName } = await updateDisplayName(ctx.userId, input.displayName);

      return {
        success: true,
        displayName,
        message: 'Display name updated successfully',
      };
    }),

  /**
   * Check if current user is a super admin
   */
  isAdmin: protectedProcedure.query(async ({ ctx }) => {
    return await isUserAdmin(ctx.userId);
  }),
});
