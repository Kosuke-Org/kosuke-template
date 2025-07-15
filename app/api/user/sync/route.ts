import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { ensureUserSynced } from '@/lib/user-sync';

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Sync user to local database
    const localUser = await ensureUserSynced(clerkUser);

    return NextResponse.json({
      success: true,
      user: {
        localId: localUser.id,
        clerkId: localUser.clerkUserId,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        displayName: clerkUser.fullName || clerkUser.firstName,
      },
    });
  } catch (error) {
    console.error('💥 User sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
