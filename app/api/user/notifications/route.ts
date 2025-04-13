import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { updateNotificationPreferences } from '@/app/(logged-out)/actions';

export async function POST(request: NextRequest) {
  try {
    // Get the user from session
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get the notification preferences from the request body
    const { marketingEmails } = await request.json();

    // Update the notification preferences
    const result = await updateNotificationPreferences(user.id, marketingEmails);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: result.success });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    );
  }
}
