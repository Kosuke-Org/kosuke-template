'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { inferRouterOutputs } from '@trpc/server';
import { formatDistanceToNow } from 'date-fns';

import type { AppRouter } from '@/lib/trpc/router';

import { Badge } from '@/components/ui/badge';

type RouterOutput = inferRouterOutputs<AppRouter>;
type LlmLogRow = RouterOutput['admin']['llmLogs']['list']['logs'][number];

export function getLlmLogsColumns(): ColumnDef<LlmLogRow>[] {
  return [
    {
      accessorKey: 'endpoint',
      header: 'Endpoint',
      cell: ({ row }) => {
        return <Badge variant="outline">{row.original.endpoint}</Badge>;
      },
    },
    {
      accessorKey: 'model',
      header: 'Model',
      cell: ({ row }) => {
        return <span className="font-mono text-sm">{row.original.model}</span>;
      },
    },
    {
      accessorKey: 'organizationName',
      header: 'Organization',
      cell: ({ row }) => {
        return <span className="text-sm">{row.original.organizationName ?? '-'}</span>;
      },
    },
    {
      accessorKey: 'promptTokens',
      header: 'Input tokens',
      cell: ({ row }) => {
        const { promptTokens } = row.original;
        if (!promptTokens) return <span className="text-muted-foreground">—</span>;
        return <span className="text-sm">{promptTokens.toLocaleString()}</span>;
      },
    },
    {
      accessorKey: 'completionTokens',
      header: 'Output tokens',
      cell: ({ row }) => {
        const { completionTokens } = row.original;
        if (!completionTokens) return <span className="text-muted-foreground">—</span>;
        return <span className="text-sm">{completionTokens.toLocaleString()}</span>;
      },
    },
    {
      accessorKey: 'reasoningTokens',
      header: 'Reasoning tokens',
      cell: ({ row }) => {
        const { reasoningTokens } = row.original;
        if (!reasoningTokens) return <span className="text-muted-foreground">—</span>;
        return <span className="text-sm">{reasoningTokens.toLocaleString()}</span>;
      },
    },
    {
      accessorKey: 'cachedInputTokens',
      header: 'Cached tokens',
      cell: ({ row }) => {
        const tokens = row.original.cachedInputTokens;
        if (!tokens) return <span className="text-muted-foreground">—</span>;
        return <span className="text-sm">{tokens.toLocaleString()}</span>;
      },
    },
    {
      accessorKey: 'responseTimeMs',
      header: 'Response Time',
      cell: ({ row }) => {
        const time = row.original.responseTimeMs;
        if (!time) return <span className="text-muted-foreground">—</span>;
        return <span className="text-sm font-medium">{time}ms</span>;
      },
    },
    {
      accessorKey: 'finishReason',
      header: 'Status',
      cell: ({ row }) => {
        const { finishReason } = row.original;

        return (
          <Badge variant={finishReason === 'error' ? 'destructive' : 'outline'}>
            {finishReason}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'timestamp',
      header: 'Date',
      cell: ({ row }) => {
        return (
          <span className="text-muted-foreground text-sm">
            {formatDistanceToNow(new Date(row.original.timestamp), { addSuffix: true })}
          </span>
        );
      },
    },
  ];
}
