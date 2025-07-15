import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser, clerkClient } from '@clerk/nextjs/server';
import { uploadProfileImage, deleteProfileImage } from '@/lib/storage';
import { syncUserFromClerk } from '@/lib/user-sync';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
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
    if (user.imageUrl) {
      await deleteProfileImage(user.imageUrl);
    }

    // Upload new image
    const imageUrl = await uploadProfileImage(file, user.id);

    // Update user profile with new image URL in Clerk
    const clerk = await clerkClient();
    await clerk.users.updateUser(user.id, {
      // Store the custom profile image URL in public metadata
      // Note: Clerk doesn't allow direct imageUrl updates via API
      publicMetadata: {
        ...user.publicMetadata,
        customProfileImageUrl: imageUrl,
      },
    });

    // Get the updated user data from Clerk
    const updatedUser = await clerk.users.getUser(user.id);

    // Sync the updated user data to local database
    await syncUserFromClerk(updatedUser);

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

export async function DELETE() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.imageUrl) {
      return NextResponse.json({ error: 'No profile image to delete' }, { status: 400 });
    }

    // Delete image from storage
    await deleteProfileImage(user.imageUrl);

    // Update user profile in Clerk
    const clerk = await clerkClient();
    await clerk.users.updateUser(user.id, {
      publicMetadata: {
        ...user.publicMetadata,
        customProfileImageUrl: null,
      },
    });

    // Get the updated user data from Clerk
    const updatedUser = await clerk.users.getUser(user.id);

    // Sync the updated user data to local database
    await syncUserFromClerk(updatedUser);

    return NextResponse.json({
      success: true,
      message: 'Profile image deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting profile image:', error);
    return NextResponse.json({ error: 'Failed to delete profile image' }, { status: 500 });
  }
}
