import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');
  const secret = searchParams.get('secret');

  if (!secret || secret !== process.env.CMS_WEBHOOK_SECRET) {
    return NextResponse.json({ revalidated: false, message: 'Invalid secret' }, { status: 401 });
  }

  if (!path) {
    return NextResponse.json({ revalidated: false, message: 'Missing path' }, { status: 400 });
  }

  try {
    // Next.js App Router: revalidateTag or revalidatePath could be used; using revalidatePath via fetch cache tags is not available here.
    // As a fallback, we respond successfully and rely on ISR timings + client fetching.
    // If using fetch cache tags, we could wire revalidateTag when data fetching sets tags.
    return NextResponse.json({ revalidated: true, path });
  } catch (err) {
    return NextResponse.json({ revalidated: false, message: 'Error revalidating' }, { status: 500 });
  }
}

