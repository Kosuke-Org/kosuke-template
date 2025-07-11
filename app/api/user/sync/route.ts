import { NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import { syncUserFromStackAuth } from '@/lib/user-sync';

export async function POST() {
  console.log('🔄 USER SYNC API - Starting...');

  try {
    const stackAuthUser = await stackServerApp.getUser();

    if (!stackAuthUser) {
      console.error('❌ No user found - unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('👤 StackAuth user found:', stackAuthUser.id);

    // Sync user to local database
    const localUser = await syncUserFromStackAuth(stackAuthUser);

    console.log('✅ User sync completed:', localUser);

    return NextResponse.json({
      success: true,
      user: {
        localId: localUser.id,
        stackAuthId: localUser.stackAuthUserId,
        email: stackAuthUser.primaryEmail,
        displayName: stackAuthUser.displayName,
      },
    });
  } catch (error) {
    console.error('💥 User sync error:', error);
    return NextResponse.json(
      {
        error: 'Failed to sync user',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
