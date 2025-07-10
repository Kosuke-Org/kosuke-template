import { eq, sql } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { z } from 'zod';

import { ApiErrorHandler } from '@/lib/api/errors';
import { ApiResponseHandler } from '@/lib/api/responses';
import { withAuth } from '@/lib/auth/middleware';
import { comparePasswords } from '@/lib/auth/session';
import { db } from '@/lib/db/drizzle';
import { getUser } from '@/lib/db/queries';
import { users, ActivityType, activityLogs } from '@/lib/db/schema';

// Define the schema for account deletion validation
const deleteAccountSchema = z.object({
  password: z.string().min(8).max(100),
});

// Log user activity
async function logActivity(userId: number, type: ActivityType) {
  await db.insert(activityLogs).values({
    userId,
    action: type,
    ipAddress: '',
  });
}

export const DELETE = withAuth(async (request: NextRequest) => {
  try {
    // Parse the request body
    const body = await request.json();
    
    // Validate the request body
    const result = deleteAccountSchema.safeParse(body);
    if (!result.success) {
      return ApiErrorHandler.validationError(result.error);
    }
    
    const { password } = result.data;
    
    // Get the user from the database
    const user = await getUser();
    if (!user) {
      return ApiErrorHandler.unauthorized('User not authenticated');
    }
    
    // Verify the password
    const isPasswordValid = await comparePasswords(password, user.passwordHash);
    if (!isPasswordValid) {
      return ApiErrorHandler.badRequest('Incorrect password. Account deletion failed');
    }
    
    // Log the activity before deletion
    await logActivity(user.id, ActivityType.DELETE_ACCOUNT);
    
    // Soft delete the user
    await db
      .update(users)
      .set({
        deletedAt: sql`CURRENT_TIMESTAMP`,
        email: sql`CONCAT(email, '-', id, '-deleted')`, // Ensure email uniqueness
      })
      .where(eq(users.id, user.id));
    
    // Delete the session cookie
    cookies().delete('session');
    
    return ApiResponseHandler.success({
      message: 'Account successfully deleted'
    });
    
  } catch (error) {
    return ApiErrorHandler.handleError(error);
  }
});