import { count, eq, isNotNull } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { documents, organizations } from '@/lib/db/schema';

export interface DocumentWithOrganization {
  id: string;
  displayName: string;
  documentResourceName: string | null;
  sizeBytes: string;
  status: 'in_progress' | 'ready' | 'error';
  createdAt: Date;
  organizationName: string | null;
  organizationSlug: string | null;
}

/**
 * Get local documents for a specific File Search Store with organization info
 */
export async function getDocumentsByFileSearchStore(fileSearchStoreName: string) {
  return await db
    .select({
      id: documents.id,
      displayName: documents.displayName,
      documentResourceName: documents.documentResourceName,
      sizeBytes: documents.sizeBytes,
      status: documents.status,
      createdAt: documents.createdAt,
      organizationName: organizations.name,
      organizationSlug: organizations.slug,
    })
    .from(documents)
    .leftJoin(organizations, eq(documents.organizationId, organizations.id))
    .where(eq(documents.fileSearchStoreName, fileSearchStoreName));
}

/**
 * Get all organizations that have documents with File Search Stores
 */
export async function getOrganizationsWithDocuments() {
  return await db
    .selectDistinct({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
    })
    .from(organizations)
    .innerJoin(documents, eq(documents.organizationId, organizations.id))
    .where(isNotNull(documents.fileSearchStoreName));
}

/**
 * Get local document counts grouped by File Search Store
 */
export async function getDocumentCountsByStore(): Promise<Map<string, number>> {
  const localDocsByStore = await db
    .select({
      fileSearchStoreName: documents.fileSearchStoreName,
      count: count(),
    })
    .from(documents)
    .where(isNotNull(documents.fileSearchStoreName))
    .groupBy(documents.fileSearchStoreName);

  return new Map(localDocsByStore.map((item) => [item.fileSearchStoreName!, item.count]));
}
