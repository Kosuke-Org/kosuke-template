import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiResponseHandler, ApiErrorHandler } from '@/lib/api';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Validation schema for notification settings
const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  marketingEmails: z.boolean(),
  securityAlerts: z.boolean(),
});

type NotificationSettings = z.infer<typeof notificationSettingsSchema>;

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized();
    }

    // Get user's current notification settings
    const user = await db
      .select({
        notificationSettings: users.notificationSettings,
      })
      .from(users)
      .where(eq(users.clerkUserId, userId))
      .limit(1);

    if (!user.length) {
      return ApiErrorHandler.notFound('User not found');
    }

    // Default settings if none exist
    const defaultSettings: NotificationSettings = {
      emailNotifications: true,
      marketingEmails: false,
      securityAlerts: true,
    };

    let settings: NotificationSettings = defaultSettings;

    if (user[0].notificationSettings) {
      try {
        settings = JSON.parse(user[0].notificationSettings);
      } catch {
        // Use default settings if JSON parsing fails
        settings = defaultSettings;
      }
    }

    return ApiResponseHandler.success(settings);
  } catch (error) {
    return ApiErrorHandler.handleError(error, 'GET /api/user/notification-settings');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized();
    }

    const body = await request.json();
    const validatedSettings = notificationSettingsSchema.parse(body);

    // Update user's notification settings
    await db
      .update(users)
      .set({
        notificationSettings: JSON.stringify(validatedSettings),
        updatedAt: new Date(),
      })
      .where(eq(users.clerkUserId, userId));

    return ApiResponseHandler.success(validatedSettings, {
      message: 'Notification settings updated successfully',
    });
  } catch (error) {
    return ApiErrorHandler.handleError(error, 'PUT /api/user/notification-settings');
  }
}
