'use client';

import * as React from 'react';

import type { inferRouterInputs } from '@trpc/server';

import { trpc } from '@/lib/trpc/client';
import type { AppRouter } from '@/lib/trpc/router';

import { useTablePagination } from '@/hooks/use-table-pagination';
import { useTableSearch } from '@/hooks/use-table-search';

type RouterInput = inferRouterInputs<AppRouter>;

type LlmLogsListFilters = RouterInput['admin']['llmLogs']['list'];

interface UseAdminLlmLogsParams {
  organizationId?: string;
  userId?: string;
  chatSessionId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export function useAdminLlmLogs(params?: UseAdminLlmLogsParams) {
  const [searchQuery, setSearchQuery] = React.useState('');

  const { searchValue, setSearchValue } = useTableSearch({
    initialValue: '',
    debounceMs: 500,
    onSearchChange: setSearchQuery,
  });

  const pagination = useTablePagination({
    initialPage: 1,
    initialPageSize: 20,
  });

  const filters: LlmLogsListFilters = {
    searchQuery: searchQuery || undefined,
    organizationId: params?.organizationId,
    chatSessionId: params?.chatSessionId,
    dateFrom: params?.dateFrom,
    dateTo: params?.dateTo,
    page: pagination.page,
    pageSize: pagination.pageSize,
  };

  const { data, isLoading } = trpc.admin.llmLogs.list.useQuery(filters, {
    staleTime: 1000 * 60 * 2, // 2 minutes
    placeholderData: (prev) => prev,
  });

  return {
    logs: data?.logs ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    pageSize: data?.pageSize ?? 20,
    totalPages: data?.totalPages ?? 0,
    isLoading,
    searchValue,
    setSearchValue,
    pagination,
  };
}

export function useAdminLlmLog(id: string) {
  return trpc.admin.llmLogs.get.useQuery({ id }, { enabled: !!id });
}
