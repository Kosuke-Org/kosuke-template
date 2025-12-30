'use client';

import * as React from 'react';

import { useAdminLlmLogs } from '@/hooks/use-admin-llm-logs';

import { TableSkeleton } from '@/components/data-table/data-table-skeleton';

import { LlmLogDrawer } from '../rag/components/llm-log-drawer';
import { getLlmLogsColumns } from '../rag/components/llm-logs-columns';
import { LlmLogsDataTable } from '../rag/components/llm-logs-data-table';

export default function AdminLlmLogsPage() {
  const [selectedLogId, setSelectedLogId] = React.useState<string | null>(null);
  const [logDrawerOpen, setLogDrawerOpen] = React.useState(false);

  const {
    logs,
    total: logsTotal,
    page: logsPage,
    pageSize: logsPageSize,
    totalPages: logsTotalPages,
    isLoading: logsLoading,
    searchValue: logsSearch,
    setSearchValue: setLogsSearch,
    pagination: logsPagination,
  } = useAdminLlmLogs();

  const handleLogsSearchChange = (value: string) => {
    setLogsSearch(value);
    if (logsPagination.page !== 1) {
      logsPagination.goToFirstPage();
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

      {logsLoading ? (
        <TableSkeleton />
      ) : (
        <LlmLogsDataTable
          columns={llmLogsColumns}
          logs={logs}
          total={logsTotal}
          page={logsPage}
          pageSize={logsPageSize}
          totalPages={logsTotalPages}
          searchQuery={logsSearch}
          onSearchChange={handleLogsSearchChange}
          onPageChange={logsPagination.setPage}
          onPageSizeChange={logsPagination.setPageSize}
          onRowClick={handleLogRowClick}
        />
      )}

      {/* LLM Log Drawer */}
      <LlmLogDrawer logId={selectedLogId} open={logDrawerOpen} onOpenChange={setLogDrawerOpen} />
    </div>
  );
}
