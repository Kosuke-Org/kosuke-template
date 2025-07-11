import { NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import { ensureUserSynced } from '@/lib/user-sync';

export async function POST() {
  try {
    const stackAuthUser = await stackServerApp.getUser();

    if (!stackAuthUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Sync user to local database
    const localUser = await ensureUserSynced(stackAuthUser);

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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
