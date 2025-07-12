import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import { uploadProfileImage, deleteProfileImage } from '@/lib/storage';
import { syncUserFromStackAuth } from '@/lib/user-sync';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: 'Invalid file type. Please upload a JPEG, PNG, or WebP image.',
        },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: 'File too large. Please upload an image smaller than 5MB.',
        },
        { status: 400 }
      );
    }

    // Delete old profile image if it exists
    if (user.profileImageUrl) {
      await deleteProfileImage(user.profileImageUrl);
    }

    // Upload new image
    const imageUrl = await uploadProfileImage(file, user.id);

    // Update user profile with new image URL
    await user.update({ profileImageUrl: imageUrl });

    // Sync the updated user data to local database
    await syncUserFromStackAuth(user);

    return NextResponse.json({
      success: true,
      imageUrl,
      message: 'Profile image updated successfully',
    });
  } catch (error) {
    console.error('Error uploading profile image:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload profile image',
      },
      { status: 500 }
    );
  }
}
