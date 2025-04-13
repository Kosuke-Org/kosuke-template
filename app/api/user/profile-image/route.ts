import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { updateProfileImage } from '@/app/(logged-out)/actions';

export async function POST(request: NextRequest) {
  try {
    // Get the user from session
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get the form data from the request
    const formData = await request.formData();

    // Pass the formData to the updateProfileImage action
    const result = await updateProfileImage(formData, formData);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: result.success });
  } catch (error) {
    console.error('Error uploading profile image:', error);
    return NextResponse.json({ error: 'Failed to upload profile image' }, { status: 500 });
  }
}
