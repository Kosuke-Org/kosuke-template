import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { z } from 'zod';

import { ApiErrorHandler } from '@/lib/api/errors';
import { ApiResponseHandler } from '@/lib/api/responses';
import { withAuth } from '@/lib/auth/middleware';
import { db } from '@/lib/db/drizzle';
import { getUser } from '@/lib/db/queries';
import { users, ActivityType, activityLogs } from '@/lib/db/schema';

// Log user activity
async function logActivity(userId: number, type: ActivityType) {
  await db.insert(activityLogs).values({
    userId,
    action: type,
    ipAddress: '',
  });
}

// Get user info
export async function GET() {
  try {
    // Get the user from session
    const user = await getUser();

    if (!user) {
      return ApiErrorHandler.unauthorized('Not authenticated');
    }

    // Don't send sensitive information to the client
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      imageUrl: user.imageUrl,
      role: user.role,
      marketingEmails: user.marketingEmails,
    };

    return ApiResponseHandler.success(safeUser);
  } catch (error) {
    return ApiErrorHandler.handleError(error);
  }
}

// Define the schema for account update validation
const updateAccountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
});

// Update user account details
export const PUT = withAuth(async (request: NextRequest) => {
  try {
    // Parse the request body
    const body = await request.json();
    
    // Validate the request body
    const result = updateAccountSchema.safeParse(body);
    if (!result.success) {
      return ApiErrorHandler.validationError(result.error);
    }
    
    const { name, email } = result.data;
    
    // Get the user from the database
    const user = await getUser();
    if (!user) {
      return ApiErrorHandler.unauthorized('User not authenticated');
    }
    
    // Check if email is being changed and verify it's not already in use
    if (email !== user.email) {
      const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
      
      if (existingUser.length > 0) {
        return ApiErrorHandler.badRequest('Email is already in use.');
      }
    }
    
    // Update user information
    await db
      .update(users)
      .set({
        name,
        email,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));
    
    await logActivity(user.id, ActivityType.UPDATE_ACCOUNT);
    
    return ApiResponseHandler.success({
      message: 'Account updated successfully',
      user: {
        id: user.id,
        name,
        email,
        imageUrl: user.imageUrl,
        role: user.role,
        marketingEmails: user.marketingEmails,
      }
    });
    
  } catch (error) {
    return ApiErrorHandler.handleError(error);
  }
});
