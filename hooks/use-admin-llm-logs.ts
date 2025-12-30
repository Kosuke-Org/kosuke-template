'use client';

import type { inferRouterInputs } from '@trpc/server';

import { trpc } from '@/lib/trpc/client';
import type { AppRouter } from '@/lib/trpc/router';

type RouterInput = inferRouterInputs<AppRouter>;

type LlmLogsListFilters = RouterInput['admin']['llmLogs']['list'];

export function useAdminLlmLogs(filters: LlmLogsListFilters) {
  return trpc.admin.llmLogs.list.useQuery(filters, {
    staleTime: 1000 * 60 * 2, // 2 minutes
    placeholderData: (prev) => prev,
  });
}

export function useAdminLlmLog(id: string) {
  return trpc.admin.llmLogs.get.useQuery({ id }, { enabled: !!id });
}
