import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth/session';

export async function GET() {
  try {
    const session = await getSession();

    return NextResponse.json({
      authenticated: !!session,
      user: session ? { id: session.user.id } : null,
    });
  } catch (error) {
    console.error('Error checking authentication:', error);
    return NextResponse.json({ error: 'Failed to check authentication' }, { status: 500 });
  }
}
