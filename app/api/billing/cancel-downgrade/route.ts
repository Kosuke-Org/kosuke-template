import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { cancelPendingDowngrade } from '@/lib/billing';
import { ensureUserSynced } from '@/lib/auth';
import { ApiErrorHandler } from '@/lib/api/errors';

/**
 * Cancel pending subscription downgrade
 * POST /api/billing/cancel-downgrade
 */
export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized();
    }

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Ensure user is synced to local database
    await ensureUserSynced(clerkUser);

    // Cancel the pending downgrade
    const result = await cancelPendingDowngrade(clerkUser.id);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('Error cancelling pending downgrade:', error);
    return ApiErrorHandler.internalServerError('Failed to cancel pending downgrade');
  }
}

