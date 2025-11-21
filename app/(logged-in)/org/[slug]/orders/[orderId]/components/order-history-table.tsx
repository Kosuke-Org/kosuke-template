/**
 * Order History Table
 * Detailed table view of all status changes and updates
 */

'use client';

import { format } from 'date-fns';

import type { OrderHistoryOutput } from '@/lib/types/order';
import { cn } from '@/lib/utils';

import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { statusColors } from '../../utils';

export function OrderHistoryTable({ history }: { history: OrderHistoryOutput }) {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <h3 className="mb-1 text-lg font-semibold">No history found</h3>
        <p className="text-muted-foreground text-sm">Status changes will appear here</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date & Time</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead>Changed By</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>
                <div className="space-y-1">
                  <div>{format(entry.createdAt, 'PP')}</div>
                  <div className="text-muted-foreground text-xs">
                    {format(entry.createdAt, 'p')}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge className={cn(statusColors[entry.status])}>{entry.status}</Badge>
              </TableCell>
              <TableCell className="max-w-md">
                {entry.notes || <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell>
                {entry.userDisplayName || entry.userEmail || (
                  <span className="text-muted-foreground italic">System</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
