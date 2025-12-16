/**
 * Authenticated File Server for Development
 *
 * This route serves files from the local uploads/ directory in development only.
 * In production, files are served directly from S3 using presigned URLs.
 *
 * Security:
 * - Authenticates user via Better Auth
 * - Verifies organization membership
 * - Validates document exists in database
 * - Prevents directory traversal attacks
 */
import { NextRequest, NextResponse } from 'next/server';

import { readFile } from 'fs/promises';
import path from 'path';

import { and, eq } from 'drizzle-orm';

import { auth } from '@/lib/auth/providers';
import { db } from '@/lib/db/drizzle';
import { documents, orgMemberships } from '@/lib/db/schema';
import { getContentTypeByExtension } from '@/lib/documents/constants';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export async function GET(request: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  try {
    const params = await props.params;
    const session = await auth.api.getSession({ headers: await request.headers });
    const user = session?.user;

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Reconstruct the file path from the URL segments
    const filePath = params.path.join('/');

    // Security: Prevent directory traversal attacks
    if (filePath.includes('..') || filePath.startsWith('/')) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    // Extract organizationId from the path (documents/{organizationId}/...)
    const pathParts = filePath.split('/');
    if (pathParts[0] !== 'documents' || !pathParts[1]) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    const organizationId = pathParts[1];

    // Check if user has access to this organization
    const membership = await db
      .select()
      .from(orgMemberships)
      .where(
        and(eq(orgMemberships.organizationId, organizationId), eq(orgMemberships.userId, user.id))
      )
      .limit(1);

    if (membership.length === 0) {
      return NextResponse.json(
        { error: 'You do not have access to this organization' },
        { status: 403 }
      );
    }

    // Verify the document exists in the database and belongs to this organization
    const document = await db
      .select()
      .from(documents)
      .where(and(eq(documents.storageUrl, filePath), eq(documents.organizationId, organizationId)))
      .limit(1);

    if (document.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Serve the file from local storage
    const fullPath = path.join(UPLOAD_DIR, filePath);
    const fileBuffer = await readFile(fullPath);

    // Determine content type from file extension using centralized constants
    const contentType = getContentTypeByExtension(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${document[0].displayName}"`,
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
