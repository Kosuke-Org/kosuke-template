import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';

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

export const POST = withAuth(async (request: NextRequest) => {
  try {
    // Get the user from the database
    const user = await getUser();
    if (!user) {
      return ApiErrorHandler.unauthorized('User not authenticated');
    }
    
    // Get the form data from the request
    const formData = await request.formData();
    
    // Get current user to access the existing imageUrl
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });
    
    // Handle profile image upload
    const profileImage = formData.get('profileImage');
    if (profileImage && typeof profileImage !== 'string' && profileImage.size > 0) {
      // Import the storage utility dynamically to prevent server/client mismatch
      const { uploadProfileImage, deleteProfileImage } = await import('@/lib/storage');
      
      // Delete previous image if exists
      if (currentUser?.imageUrl) {
        await deleteProfileImage(currentUser.imageUrl);
      }
      
      // Upload new image
      const imageUrl = await uploadProfileImage(profileImage, user.id);
      
      // Update the image URL in the database
      await db.update(users).set({ imageUrl, updatedAt: new Date() }).where(eq(users.id, user.id));
      
      await logActivity(user.id, ActivityType.UPDATE_PROFILE);
      
      return ApiResponseHandler.success({
        message: 'Profile image updated successfully',
        imageUrl
      });
    }
    
    return ApiErrorHandler.badRequest('No image provided');
  } catch (error) {
    return ApiErrorHandler.handleError(error);
  }
});
