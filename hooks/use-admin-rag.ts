'use client';

import { trpc } from '@/lib/trpc/client';

export function useAdminFileSearchStores() {
  return trpc.admin.rag.listStores.useQuery(undefined, {
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
