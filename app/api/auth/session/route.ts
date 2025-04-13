import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth/session';

export async function GET() {
  try {
    const session = await getSession();

    return NextResponse.json(
      {
        user: session?.user || null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch session',
      },
      { status: 500 }
    );
  }
}
