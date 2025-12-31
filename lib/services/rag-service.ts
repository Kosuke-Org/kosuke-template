import type { Document, FileSearchStore } from '@google/genai';
import { eq } from 'drizzle-orm';

import {
  deleteDocumentFromFileSearchStore,
  deleteFileSearchStore,
  listDocuments,
  listFileSearchStores,
} from '@/lib/ai/rag';
import { db } from '@/lib/db/drizzle';
import { type NewRagSettings, type RagSettings, ragSettings } from '@/lib/db/schema';
import {
  type DocumentWithOrganization,
  getDocumentCountsByStore,
  getDocumentsByFileSearchStore,
  getOrganizationsWithDocuments,
} from '@/lib/services/documents-service';

/**
 * Internal type: Enriched File Search Store with sync status and organization info
 * This extends the Google API FileSearchStore with our custom fields
 */
interface EnrichedStore extends FileSearchStore {
  // Override to make these required since we filter out stores without names
  name: string;
  displayName: string;
  // Our custom fields for sync status and organization mapping
  documentCount: number;
  localCount: number;
  syncStatus: 'synced' | 'mismatch';
  organization: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

/**
 * Internal type: Document with sync status between local DB and Google File Search Store
 */
interface DocumentWithSyncStatus {
  id: string;
  displayName: string;
  status: 'in_progress' | 'ready' | 'error';
  syncStatus: 'synced' | 'pending' | 'orphaned';
  sizeBytes: string;
  createdAt: Date;
  organizationName: string | null;
  organizationSlug: string | null;
  metadata: Document | null;
}

/**
 * Get all Google File Search Stores
 * @throws Error with original Google API error as cause
 */
async function getAllFileSearchStores(): Promise<FileSearchStore[]> {
  try {
    const storesPager = await listFileSearchStores();
    const stores = [];
    for await (const store of storesPager) {
      if (store.name) {
        stores.push(store);
      }
    }
    return stores;
  } catch (error) {
    throw new Error('Failed to fetch File Search Stores from Google API', {
      cause: error,
    });
  }
}

/**
 * Get all documents in a File Search Store
 * @throws Error with original Google API error as cause
 */
async function getFileSearchStoreDocuments(storeName: string): Promise<Document[]> {
  try {
    const documentsPager = await listDocuments(storeName);
    const documents = [];
    for await (const doc of documentsPager) {
      if (doc.name) {
        documents.push(doc);
      }
    }
    return documents;
  } catch (error) {
    throw new Error(`Failed to fetch documents from Google API store: ${storeName}`, {
      cause: error,
    });
  }
}

/**
 * Combine store data with sync status and organization info
 */
async function enrichStoresWithSyncStatus(
  stores: FileSearchStore[],
  localCountMap: Map<string, number>,
  orgsWithDocs: Array<{ id: string; name: string; slug: string }>
): Promise<EnrichedStore[]> {
  return stores.map((store) => {
    const localCount = localCountMap.get(store.name!) || 0;
    // Use activeDocumentsCount from the store metadata instead of fetching all documents
    const documentCount = parseInt(store.activeDocumentsCount || '0', 10);

    // Find organization by matching slug in store displayName
    const org = orgsWithDocs.find((o) => store.displayName?.includes(o.slug));

    return {
      ...store, // Spread all FileSearchStore properties
      name: store.name!,
      displayName: store.displayName || store.name!,
      documentCount,
      localCount,
      syncStatus: documentCount === localCount ? ('synced' as const) : ('mismatch' as const),
      organization: org
        ? {
            id: org.id,
            name: org.name,
            slug: org.slug,
          }
        : null,
    };
  });
}

/**
 * Merge local and File Search Store documents with sync status
 */
function mergeDocumentsWithSyncStatus(
  localDocs: DocumentWithOrganization[],
  searchStoreDocuments: Document[]
): DocumentWithSyncStatus[] {
  const searchStoreDocumentsMap = new Map(searchStoreDocuments.map((doc) => [doc.name, doc]));

  return localDocs.map((localDoc) => {
    const searchStoreDocument = localDoc.documentResourceName
      ? searchStoreDocumentsMap.get(localDoc.documentResourceName)
      : null;

    return {
      id: localDoc.id,
      displayName: localDoc.displayName,
      status: localDoc.status,
      syncStatus: searchStoreDocument
        ? ('synced' as const)
        : localDoc.status === 'in_progress'
          ? ('pending' as const)
          : ('orphaned' as const),
      sizeBytes: localDoc.sizeBytes,
      createdAt: localDoc.createdAt,
      organizationName: localDoc.organizationName,
      organizationSlug: localDoc.organizationSlug,
      metadata: searchStoreDocument || null,
    };
  });
}

/**
 * Find orphaned documents (in File Search Store but not in database)
 */
function findOrphanedDocuments(
  searchStoreDocuments: Document[],
  localDocuments: DocumentWithOrganization[]
): DocumentWithSyncStatus[] {
  const localResourceNames = new Set(
    localDocuments
      .map((doc) => doc.documentResourceName)
      .filter((name): name is string => name !== null)
  );

  return searchStoreDocuments
    .filter((doc) => doc.name && !localResourceNames.has(doc.name))
    .map((doc) => ({
      id: doc.name!, // Use File Search Store name as ID for orphaned docs
      displayName: doc.displayName || 'Unknown',
      status: 'ready' as const,
      syncStatus: 'orphaned' as const,
      sizeBytes: doc.sizeBytes || '0',
      createdAt: doc.createTime ? new Date(doc.createTime) : new Date(),
      organizationName: null,
      organizationSlug: null,
      metadata: doc,
    }));
}

/**
 * List File Search Stores for organizations that have documents
 * Only shows stores that belong to organizations in the database
 *
 * @throws Error from database operations (propagated naturally)
 * @throws Error from Google API operations (wrapped with context)
 */
export async function listStores(): Promise<{ stores: EnrichedStore[] }> {
  const orgsWithDocs = await getOrganizationsWithDocuments();
  const orgSlugs = new Set(orgsWithDocs.map((org) => org.slug));

  const fileSearchStores = await getAllFileSearchStores();

  const filteredStores = fileSearchStores.filter((store) => {
    return Array.from(orgSlugs).some((slug) => store.displayName?.includes(slug));
  });

  const localCountMap = await getDocumentCountsByStore();

  const storesWithSync = await enrichStoresWithSyncStatus(
    filteredStores,
    localCountMap,
    orgsWithDocs
  );

  return {
    stores: storesWithSync,
  };
}

/**
 * Get documents for a specific File Search Store with sync status
 *
 * @throws Error from database operations (propagated naturally)
 * @throws Error from Google API operations (wrapped with context)
 */
export async function getStoreDocuments(
  fileSearchStoreName: string
): Promise<{ documents: DocumentWithSyncStatus[] }> {
  // Both DB and Google API errors will propagate with their context
  const fileSearchStoreDocuments = await getFileSearchStoreDocuments(fileSearchStoreName);
  const localDocuments = await getDocumentsByFileSearchStore(fileSearchStoreName);

  const documentsWithSync = mergeDocumentsWithSyncStatus(localDocuments, fileSearchStoreDocuments);
  const orphanedGoogleDocs = findOrphanedDocuments(fileSearchStoreDocuments, localDocuments);

  return {
    documents: [...documentsWithSync, ...orphanedGoogleDocs],
  };
}

/**
 * Delete a File Search Store
 *
 * @throws Error from Google API operations
 */
export async function deleteStore(
  storeName: string
): Promise<{ success: boolean; message: string }> {
  await deleteFileSearchStore({ name: storeName });

  return {
    success: true,
    message: 'File Search Store deleted successfully',
  };
}

/**
 * Delete all documents from a File Search Store
 *
 * @throws Error from Google API operations
 */
export async function deleteAllDocuments(
  storeName: string
): Promise<{ success: boolean; message: string; deletedCount: number }> {
  const fileSearchStoreDocuments = await getFileSearchStoreDocuments(storeName);

  let deletedCount = 0;
  const errors: string[] = [];

  for (const doc of fileSearchStoreDocuments) {
    if (doc.name) {
      try {
        await deleteDocumentFromFileSearchStore({ name: doc.name });
        deletedCount++;
      } catch (error) {
        errors.push(`Failed to delete ${doc.displayName || doc.name}: ${error}`);
      }
    }
  }

  if (errors.length > 0 && deletedCount === 0) {
    throw new Error(`Failed to delete documents: ${errors.join(', ')}`);
  }

  return {
    success: true,
    message: `Deleted ${deletedCount} document(s)${errors.length > 0 ? ` (${errors.length} failed)` : ''}`,
    deletedCount,
  };
}

/**
 * Delete dangling documents (documents in File Search Store but not in database)
 *
 * @throws Error from Google API operations
 */
export async function deleteDanglingDocuments(
  storeName: string
): Promise<{ success: boolean; message: string; deletedCount: number }> {
  const fileSearchStoreDocuments = await getFileSearchStoreDocuments(storeName);
  const localDocuments = await getDocumentsByFileSearchStore(storeName);

  const localResourceNames = new Set(
    localDocuments
      .map((doc) => doc.documentResourceName)
      .filter((name): name is string => name !== null)
  );

  const danglingDocs = fileSearchStoreDocuments.filter(
    (doc) => doc.name && !localResourceNames.has(doc.name)
  );

  let deletedCount = 0;
  const errors: string[] = [];

  for (const doc of danglingDocs) {
    if (doc.name) {
      try {
        await deleteDocumentFromFileSearchStore({ name: doc.name });
        deletedCount++;
      } catch (error) {
        errors.push(`Failed to delete ${doc.displayName || doc.name}: ${error}`);
      }
    }
  }

  if (errors.length > 0 && deletedCount === 0) {
    throw new Error(`Failed to delete dangling documents: ${errors.join(', ')}`);
  }

  return {
    success: true,
    message: `Deleted ${deletedCount} dangling document(s)${errors.length > 0 ? ` (${errors.length} failed)` : ''}`,
    deletedCount,
  };
}

/**
 * Get RAG settings for an organization
 * @param organizationId - The ID of the organization
 * @returns The RAG settings or null if not found
 */
export async function getRAGSettings(
  organizationId: NewRagSettings['organizationId']
): Promise<RagSettings | null> {
  const [settings] = await db
    .select()
    .from(ragSettings)
    .where(eq(ragSettings.organizationId, organizationId));

  return settings ?? null;
}

/**
 * Update RAG settings for an organization
 * Creates settings if they don't exist
 * @param settings - The settings to update
 * @returns The updated RAG settings
 */
export async function updateRAGSettings(settings: NewRagSettings): Promise<RagSettings> {
  const { organizationId, ...updates } = settings;
  // Check if settings exist
  const existing = await getRAGSettings(organizationId);

  if (existing) {
    // Update existing settings
    const [updated] = await db
      .update(ragSettings)
      .set(updates)
      .where(eq(ragSettings.organizationId, organizationId))
      .returning();

    return updated;
  } else {
    // Create new settings
    const [created] = await db
      .insert(ragSettings)
      .values({
        organizationId,
        ...updates,
      })
      .returning();

    return created;
  }
}
