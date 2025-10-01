import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cms-secret');
  if (!secret || secret !== process.env.CMS_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { model?: string; entry?: { slug?: string } };
    const toRevalidate: string[] = ['/blog', '/privacy', '/terms'];

    if (body?.entry?.slug) {
      toRevalidate.push(`/blog/${body.entry.slug}`);
      if (body.entry.slug === 'privacy' || body.entry.slug === 'terms') {
        toRevalidate.push(`/${body.entry.slug}`);
      }
    }

    await Promise.all(toRevalidate.map((path) => req.nextUrl.pathname && fetch(`${req.nextUrl.origin}/api/revalidate?path=${encodeURIComponent(path)}&secret=${process.env.CMS_WEBHOOK_SECRET}`)));

    return NextResponse.json({ ok: true, revalidated: toRevalidate });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 });
  }
}

