/**
 * Authenticated File Server for Development
 *
 * This route serves files from the local uploads/ directory in development only.
 * In production, files are served directly from S3 using presigned URLs.
 *
 * Security (see `lib/auth/guards.ts`):
 * - requireUser: authenticates the user before anything else is revealed
 * - requireOrgAccess: verifies membership of the organization owning the path
 * - requireOrgDocument: verifies a document row exists for that storage path
 * - resolveUploadPath: resolves the path and asserts it stays inside UPLOAD_DIR
 */
import { NextRequest, NextResponse } from 'next/server';

import { readFile } from 'fs/promises';
import path from 'path';

import { ApiResponseHandler } from '@/lib/api';
import { requireOrgAccess, requireOrgDocument, requireUser } from '@/lib/auth/guards';
import { getContentTypeByExtension } from '@/lib/documents/constants';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

/**
 * Resolve a request-supplied relative path against UPLOAD_DIR and assert the
 * result is still inside it. Returns null for anything that escapes.
 *
 * This is the authoritative traversal check: it compares resolved absolute
 * paths rather than pattern-matching the raw string, so encoded, nested, and
 * absolute-path payloads are all covered.
 */
function resolveUploadPath(relativePath: string): string | null {
  const root = path.resolve(UPLOAD_DIR);
  const resolved = path.resolve(root, relativePath);

  return resolved.startsWith(root + path.sep) ? resolved : null;
}

export async function GET(request: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  try {
    const params = await props.params;

    const authenticated = await requireUser(request);
    if (!authenticated.ok) return authenticated.response;

    // Reconstruct the file path from the URL segments
    const filePath = params.path.join('/');

    // Security: Prevent directory traversal attacks
    if (filePath.includes('..') || filePath.startsWith('/')) {
      return ApiResponseHandler.badRequest('Invalid file path');
    }

    const fullPath = resolveUploadPath(filePath);
    if (!fullPath) {
      return ApiResponseHandler.badRequest('Invalid file path');
    }

    // Extract organizationId from the path (documents/{organizationId}/...)
    const pathParts = filePath.split('/');
    if (pathParts[0] !== 'documents' || !pathParts[1]) {
      return ApiResponseHandler.badRequest('Invalid file path');
    }

    const organizationId = pathParts[1];

    const access = await requireOrgAccess(request, organizationId);
    if (!access.ok) return access.response;

    const found = await requireOrgDocument(organizationId, { storageUrl: filePath });
    if (!found.ok) return found.response;

    // Serve the file from local storage
    const fileBuffer = await readFile(fullPath);

    // Determine content type from file extension using centralized constants
    const contentType = getContentTypeByExtension(filePath);

    const DOWNLOAD_CACHE_MAX_AGE = 60 * 60; // 1 hour
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${found.document.displayName}"`,
        'Cache-Control': `private, max-age=${DOWNLOAD_CACHE_MAX_AGE}`,
      },
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return ApiResponseHandler.notFound('File not found');
  }
}
