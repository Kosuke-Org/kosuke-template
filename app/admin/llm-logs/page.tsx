'use client';

import * as React from 'react';

import { useAdminLlmLogs } from '@/hooks/use-admin-llm-logs';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { useTableSearch } from '@/hooks/use-table-search';

import { TableSkeleton } from '@/components/data-table/data-table-skeleton';

import { LlmLogDrawer } from '../rag/components/llm-log-drawer';
import { getLlmLogsColumns } from '../rag/components/llm-logs-columns';
import { LlmLogsDataTable } from '../rag/components/llm-logs-data-table';

export default function AdminLlmLogsPage() {
  const [selectedLogId, setSelectedLogId] = React.useState<string | null>(null);
  const [logDrawerOpen, setLogDrawerOpen] = React.useState(false);

  const { inputValue, searchValue, setSearchValue } = useTableSearch({
    initialValue: '',
    debounceMs: 500,
  });

  const pagination = useTablePagination({
    initialPage: 1,
    initialPageSize: 20,
  });

  const { data, isLoading } = useAdminLlmLogs({
    searchQuery: searchValue.trim() || undefined,
    page: pagination.page,
    pageSize: pagination.pageSize,
  });

  const handleLogsSearchChange = (value: string) => {
    setSearchValue(value);
    if (pagination.page !== 1) {
      pagination.goToFirstPage();
    }
  };

  const handleLogRowClick = (id: string) => {
    setSelectedLogId(id);
    setLogDrawerOpen(true);
  };

  const llmLogsColumns = React.useMemo(() => getLlmLogsColumns(), []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">LLM Logs</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          View and analyze all LLM API calls and responses
        </p>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <LlmLogsDataTable
          columns={llmLogsColumns}
          logs={data?.logs ?? []}
          total={data?.total ?? 0}
          page={data?.page ?? 1}
          pageSize={data?.pageSize ?? 20}
          totalPages={data?.totalPages ?? 0}
          searchQuery={inputValue}
          onSearchChange={handleLogsSearchChange}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
          onRowClick={handleLogRowClick}
        />
      )}

      {/* LLM Log Drawer */}
      <LlmLogDrawer logId={selectedLogId} open={logDrawerOpen} onOpenChange={setLogDrawerOpen} />
    </div>
  );
}
