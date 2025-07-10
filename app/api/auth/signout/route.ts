import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

import { ApiErrorHandler } from '@/lib/api/errors';
import { ApiResponseHandler } from '@/lib/api/responses';
import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db/drizzle';
import { ActivityType, activityLogs } from '@/lib/db/schema';

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
    // Get the user from the session
    const session = await getSession();
    
    // Only log activity if user exists
    if (session?.userId) {
      await logActivity(session.userId, ActivityType.SIGN_OUT);
    }
    
    // Delete the session cookie
    cookies().delete('session');
    
    return ApiResponseHandler.success({
      message: 'Successfully signed out'
    });
  } catch (error) {
    return ApiErrorHandler.handleError(error);
  }
}
