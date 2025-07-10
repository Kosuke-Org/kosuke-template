import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { z } from 'zod';

import { ApiErrorHandler } from '@/lib/api/errors';
import { ApiResponseHandler } from '@/lib/api/responses';
import { withAuth } from '@/lib/auth/middleware';
import { comparePasswords, hashPassword } from '@/lib/auth/session';
import { db } from '@/lib/db/drizzle';
import { getUser } from '@/lib/db/queries';
import { users, ActivityType, activityLogs } from '@/lib/db/schema';

// Define the schema for password update validation
const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(8).max(100),
    newPassword: z.string().min(8).max(100),
    confirmPassword: z.string().min(8).max(100),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

// Log user activity
async function logActivity(userId: number, type: ActivityType) {
  await db.insert(activityLogs).values({
    userId,
    action: type,
    ipAddress: '',
  });
}

export const PUT = withAuth(async (request: NextRequest) => {
  try {
    // Parse the request body
    const body = await request.json();
    
    // Validate the request body
    const result = updatePasswordSchema.safeParse(body);
    if (!result.success) {
      return ApiErrorHandler.validationError(result.error);
    }
    
    const { currentPassword, newPassword } = result.data;
    
    // Get the user from the database
    const user = await getUser();
    if (!user) {
      return ApiErrorHandler.unauthorized('User not authenticated');
    }
    
    // Verify the current password
    const isPasswordValid = await comparePasswords(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      return ApiErrorHandler.badRequest('Current password is incorrect');
    }
    
    // Check if new password is same as current
    if (currentPassword === newPassword) {
      return ApiErrorHandler.badRequest('New password must be different from the current password');
    }
    
    // Hash the new password
    const newPasswordHash = await hashPassword(newPassword);
    
    // Update the password in the database and log activity
    await Promise.all([
      db.update(users).set({ passwordHash: newPasswordHash }).where(eq(users.id, user.id)),
      logActivity(user.id, ActivityType.UPDATE_PASSWORD)
    ]);
    
    return ApiResponseHandler.success({
      message: 'Password updated successfully'
    });
    
  } catch (error) {
    return ApiErrorHandler.handleError(error);
  }
});