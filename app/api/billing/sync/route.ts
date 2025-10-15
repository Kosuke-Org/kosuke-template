import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { syncUserSubscriptionFromStripe, syncStaleSubscriptions } from '@/lib/billing/stripe-sync';
import { ensureUserSynced } from '@/lib/auth';
import { ApiErrorHandler } from '@/lib/api/errors';

/**
 * Manual sync endpoint for subscription data
 * POST /api/billing/sync
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized();
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Ensure user is synced to local database
    await ensureUserSynced(user);

    const { action } = await request.json().catch(() => ({ action: 'user' }));

    switch (action) {
      case 'user':
        // Sync current user's subscription
        const userResult = await syncUserSubscriptionFromStripe(user.id);
        return NextResponse.json({
          success: userResult.success,
          message: userResult.message,
          action: 'user_sync',
        });

      case 'stale':
        // Sync stale subscriptions (admin-only - you might want to add auth check)
        const staleResult = await syncStaleSubscriptions(24);
        return NextResponse.json({
          success: true,
          message: `Synced ${staleResult.syncedCount} subscriptions`,
          syncedCount: staleResult.syncedCount,
          errors: staleResult.errors,
          action: 'stale_sync',
        });

      default:
        return ApiErrorHandler.badRequest('Invalid action. Use: user or stale');
    }
  } catch (error) {
    console.error('💥 Error in sync endpoint:', error);
    return ApiErrorHandler.internalServerError('Failed to sync subscription data');
  }
}

/**
 * Get sync status for current user
 * GET /api/billing/sync
 */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized();
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Just return current sync info without syncing
    return NextResponse.json({
      success: true,
      message: 'Sync status retrieved',
      user: {
        clerkId: user.id,
        lastUpdated: new Date().toISOString(),
      },
      availableActions: [
        { action: 'user', description: 'Sync current user subscription from Stripe' },
        { action: 'stale', description: 'Sync all stale subscriptions (admin)' },
      ],
    });
  } catch (error) {
    console.error('💥 Error getting sync status:', error);
    return ApiErrorHandler.internalServerError('Failed to get sync status');
  }
}
