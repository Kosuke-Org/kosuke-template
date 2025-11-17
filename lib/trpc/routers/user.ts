/**
 * tRPC router for user operations
 * Handles user settings and profile management
 */
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';

import { AUTH_ERRORS } from '@/lib/auth/constants';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
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
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        emailVerified: users.emailVerified,
        displayName: users.displayName,
        profileImageUrl: users.profileImageUrl,
        stripeCustomerId: users.stripeCustomerId,
        notificationSettings: users.notificationSettings,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, input.userId))
      .limit(1);

    if (!user) {
      throw new TRPCError({ code: 'NOT_FOUND', message: AUTH_ERRORS.USER_NOT_FOUND });
    }

    return user;
  }),

  /**
   * Get user's notification settings
   */
  getNotificationSettings: protectedProcedure.query(async ({ ctx }) => {
    const user = await db
      .select({ notificationSettings: users.notificationSettings })
      .from(users)
      .where(eq(users.id, ctx.userId))
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
        .where(eq(users.id, ctx.userId));

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
      if (user?.image) {
        await deleteProfileImage(user.image);
      }

      // Upload new image
      const imageUrl = await uploadProfileImage(file, ctx.userId);

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
    const userId = ctx.userId;
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });

    if (!user?.profileImageUrl) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No profile image to delete',
      });
    }

    await deleteProfileImage(user.profileImageUrl);
    await db.update(users).set({ profileImageUrl: null }).where(eq(users.id, userId));

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
      await db
        .update(users)
        .set({
          displayName: input.displayName,
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.userId));

      return {
        success: true,
        displayName: input.displayName,
        message: 'Display name updated successfully',
      };
    }),
});
