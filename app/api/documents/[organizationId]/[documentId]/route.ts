/**
 * Document Download Proxy
 *
 * This endpoint serves as a proxy for document downloads with presigned URLs.
 * It validates user access and generates fresh presigned URLs on each request.
 *
 * Security (see `lib/auth/guards.ts`):
 * - requireOrgAccess: authenticates the user and verifies organization membership
 * - requireOrgDocument: verifies the document exists and belongs to that organization
 * - Generates fresh presigned URLs (1 hour expiry)
 *
 * Usage:
 * GET /api/documents/{organizationId}/{documentId}
 */
import { NextRequest, NextResponse } from 'next/server';

import { ApiResponseHandler } from '@/lib/api/responses';
import { requireOrgAccess, requireOrgDocument } from '@/lib/auth/guards';
import { getPresignedDownloadUrl } from '@/lib/storage';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ organizationId: string; documentId: string }> }
) {
  try {
    const { documentId, organizationId } = await props.params;

    // Validate required parameters
    if (!documentId || !organizationId) {
      return ApiResponseHandler.badRequest('Missing documentId or organizationId');
    }

    const access = await requireOrgAccess(request, organizationId);
    if (!access.ok) return access.response;

    const found = await requireOrgDocument(organizationId, { documentId });
    if (!found.ok) return found.response;

    if (!found.document.storageUrl) {
      return ApiResponseHandler.notFound('Document has no storage URL');
    }

    // Generate presigned URL and redirect to it
    const presignedUrl = await getPresignedDownloadUrl(found.document.storageUrl);
    return NextResponse.redirect(presignedUrl);
  } catch (error) {
    console.error('Error serving document:', error);
    return ApiResponseHandler.internalServerError(
      error instanceof Error ? error.message : 'Failed to serve document'
    );
  }
}
