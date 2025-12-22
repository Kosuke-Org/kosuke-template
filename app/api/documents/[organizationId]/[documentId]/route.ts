/**
 * Document Download Proxy
 *
 * This endpoint serves as a proxy for document downloads with presigned URLs.
 * It validates user access and generates fresh presigned URLs on each request.
 *
 * Security:
 * - Authenticates user via Better Auth
 * - Verifies organization membership
 * - Validates document exists and belongs to organization
 * - Generates fresh presigned URLs (1 hour expiry)
 *
 * Usage:
 * GET /api/documents/{organizationId}/{documentId}
 */
import { NextRequest, NextResponse } from 'next/server';

import { and, eq } from 'drizzle-orm';

import { auth } from '@/lib/auth/providers';
import { db } from '@/lib/db/drizzle';
import { documents, orgMemberships } from '@/lib/db/schema';
import { getPresignedDownloadUrl } from '@/lib/storage';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ organizationId: string; documentId: string }> }
) {
  try {
    const params = await props.params;
    const { documentId, organizationId } = params;

    // Validate required parameters
    if (!documentId || !organizationId) {
      return NextResponse.json({ error: 'Missing documentId or organizationId' }, { status: 400 });
    }

    // Authenticate user
    const session = await auth.api.getSession({ headers: request.headers });
    const user = session?.user;

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // Verify the document exists and belongs to this organization
    const document = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.organizationId, organizationId)))
      .limit(1);

    if (document.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const doc = document[0];

    if (!doc.storageUrl) {
      return NextResponse.json({ error: 'Document has no storage URL' }, { status: 404 });
    }

    // Generate presigned URL
    const presignedUrl = await getPresignedDownloadUrl(doc.storageUrl);

    // Redirect to presigned URL
    return NextResponse.redirect(presignedUrl);
  } catch (error) {
    console.error('Error serving document:', error);
    return NextResponse.json({ error: 'Failed to serve document' }, { status: 500 });
  }
}
