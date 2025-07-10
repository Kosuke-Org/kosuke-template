import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { z } from 'zod';

import { ApiErrorHandler } from '@/lib/api/errors';
import { ApiResponseHandler } from '@/lib/api/responses';
import { hashPassword, setSession } from '@/lib/auth/session';
import { db } from '@/lib/db/drizzle';
import { users, ActivityType, activityLogs, type NewUser } from '@/lib/db/schema';

// Define the schema for sign up validation
const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Log user activity
async function logActivity(userId: number, type: ActivityType) {
  await db.insert(activityLogs).values({
    userId,
    action: type,
    ipAddress: '',
  });
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    
    // Validate the request body
    const result = signUpSchema.safeParse(body);
    if (!result.success) {
      return ApiErrorHandler.validationError(result.error);
    }
    
    const { email, password } = result.data;
    
    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (existingUser.length > 0) {
      return ApiErrorHandler.badRequest('Email already in use. Please use a different email.');
    }
    
    // Hash the password
    const passwordHash = await hashPassword(password);
    
    // Create new user
    const newUser: NewUser = {
      email,
      passwordHash,
      role: 'owner', // Default role
    };
    
    // Insert the user into the database
    const [createdUser] = await db.insert(users).values(newUser).returning();
    
    if (!createdUser) {
      return ApiErrorHandler.serverError(new Error('Failed to create user'));
    }
    
    // Set session and log activity
    await Promise.all([
      setSession(createdUser),
      logActivity(createdUser.id, ActivityType.SIGN_UP)
    ]);
    
    // Return successful response with user data (excluding sensitive fields)
    const userData = {
      id: createdUser.id,
      email: createdUser.email,
      name: createdUser.name,
      role: createdUser.role,
      createdAt: createdUser.createdAt,
      updatedAt: createdUser.updatedAt,
    };
    
    return ApiResponseHandler.created({
      user: userData,
      message: 'User successfully created'
    });
    
  } catch (error) {
    return ApiErrorHandler.handleError(error);
  }
}