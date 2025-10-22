import { NextResponse } from 'next/server';
import { runPeriodicSync, checkSyncHealth } from '@/lib/billing/cron-sync';
import { AUTH_ERRORS } from '@/lib/auth/constants';

/**
 * Vercel Cron endpoint for periodic subscription syncing
 * This endpoint is called by Vercel Cron Jobs to keep subscription data in sync
 *
 * Security: This endpoint is protected by CRON_SECRET environment variable
 * - Vercel Cron automatically sends secret as query parameter
 * - Requests without valid secret are rejected with 401 Unauthorized
 * - In production, CRON_SECRET is required; development allows skipping auth
 *
 * Setup:
 * 1. Set CRON_SECRET environment variable in Vercel Dashboard
 * 2. Vercel.json is configured to send this secret as query parameter
 * 3. Only authenticated requests can trigger the sync
 */

export async function GET(request: Request) {
  try {
    // Security check - verify the request is authorized
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const url = new URL(request.url);
      const providedSecret = url.searchParams.get('secret');

      if (providedSecret !== cronSecret) {
        console.warn('🚫 Unauthorized cron request attempt');
        return NextResponse.json({ error: AUTH_ERRORS.UNAUTHORIZED }, { status: 401 });
      }
    } else {
      // In development, warn if CRON_SECRET is not set
      if (process.env.NODE_ENV === 'production') {
        console.error('⚠️ CRON_SECRET not set in production environment');
        return NextResponse.json({ error: AUTH_ERRORS.CONFIGURATION_ERROR }, { status: 500 });
      } else {
        console.warn('⚠️ CRON_SECRET not set - skipping auth check in development');
      }
    }

    console.log('🕐 Vercel Cron: Starting periodic subscription sync...');

    // Run the periodic sync
    const result = await runPeriodicSync();

    // Log the result
    if (result.success) {
      console.log(
        `✅ Vercel Cron: Sync completed successfully - ${result.syncedCount} synced, ${result.errorCount} errors`
      );
    } else {
      console.error(`💥 Vercel Cron: Sync failed - ${result.error}`);
    }

    return NextResponse.json({
      success: result.success,
      timestamp: result.timestamp,
      ...(result.success
        ? {
            syncedCount: result.syncedCount,
            errorCount: result.errorCount,
          }
        : {
            error: result.error,
          }),
    });
  } catch (error) {
    console.error('💥 Vercel Cron: Unexpected error in sync endpoint:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint for the sync system
 */
export async function POST() {
  try {
    const health = await checkSyncHealth();

    return NextResponse.json({
      ...health,
      endpoint: 'cron/sync-subscriptions',
      message: 'Sync system health check completed',
    });
  } catch (error) {
    console.error('💥 Health check failed:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
