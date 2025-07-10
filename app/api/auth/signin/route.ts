import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { z } from 'zod';

import { ApiErrorHandler } from '@/lib/api/errors';
import { ApiResponseHandler } from '@/lib/api/responses';
import { comparePasswords, setSession } from '@/lib/auth/session';
import { db } from '@/lib/db/drizzle';
import { users, ActivityType, activityLogs } from '@/lib/db/schema';

// Define the schema for sign in validation
const signInSchema = z.object({
  email: z.string().email().min(3).max(255),
  password: z.string().min(8).max(100),
});

// Log user activity
async function logActivity(userId: number, type: ActivityType, ipAddress?: string) {
  await db.insert(activityLogs).values({
    userId,
    action: type,
    ipAddress: ipAddress || '',
  });
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    
    // Validate the request body
    const result = signInSchema.safeParse(body);
    if (!result.success) {
      return ApiErrorHandler.validationError(result.error);
    }
    
    const { email, password } = result.data;
    
    // Look up the user in the database
    const userResult = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (userResult.length === 0) {
      return ApiErrorHandler.badRequest('Invalid email or password. Please try again.');
    }
    
    const foundUser = userResult[0];
    
    // Verify the password
    const isPasswordValid = await comparePasswords(password, foundUser.passwordHash);
    
    if (!isPasswordValid) {
      return ApiErrorHandler.badRequest('Invalid email or password. Please try again.');
    }
    
    // Set session and log activity
    await Promise.all([
      setSession(foundUser),
      logActivity(foundUser.id, ActivityType.SIGN_IN)
    ]);
    
    // Return successful response with user data (excluding sensitive fields)
    // Create a new object without the password hash
    const userData = {
      id: foundUser.id,
      email: foundUser.email,
      name: foundUser.name,
      role: foundUser.role,
      createdAt: foundUser.createdAt,
      updatedAt: foundUser.updatedAt,
      imageUrl: foundUser.imageUrl,
      marketingEmails: foundUser.marketingEmails,
    };
    
    return ApiResponseHandler.success({
      user: userData,
      message: 'Successfully signed in'
    });
    
  } catch (error) {
    return ApiErrorHandler.handleError(error);
  }
}