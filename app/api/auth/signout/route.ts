import { NextResponse } from 'next/server';
import { signOut } from '@/app/(logged-out)/actions';

export async function POST() {
  try {
    await signOut();
    return NextResponse.json({ success: 'Successfully signed out' });
  } catch (error) {
    console.error('Error during sign out:', error);
    return NextResponse.json({ error: 'Failed to sign out' }, { status: 500 });
  }
}
