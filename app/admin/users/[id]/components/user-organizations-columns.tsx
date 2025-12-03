/**
 * User Organizations Table Column Definitions
 * Defines columns for organizations that a user belongs to
 */

'use client';

import { ColumnDef } from '@tanstack/react-table';
import type { inferRouterOutputs } from '@trpc/server';
import { format } from 'date-fns';
import { MoreHorizontal, Shield, X } from 'lucide-react';

import type { AppRouter } from '@/lib/trpc/router';

import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Infer MembershipWithDetails from tRPC router output
type RouterOutput = inferRouterOutputs<AppRouter>;
type MembershipWithDetails = RouterOutput['admin']['memberships']['list']['memberships'][number];

interface ColumnActionsProps {
  onRemove: (id: string, userName: string, orgName: string) => void;
}

export function getUserOrganizationsColumns(
  actions: ColumnActionsProps
): ColumnDef<MembershipWithDetails>[] {
  const { onRemove } = actions;

  const columns: ColumnDef<MembershipWithDetails>[] = [
    {
      accessorKey: 'organization',
      header: () => <DataTableColumnHeader title="Organization" />,
      cell: ({ row }) => {
        return <div className="font-medium">{row.original.organization.name}</div>;
      },
    },
    {
      accessorKey: 'role',
      header: () => <DataTableColumnHeader title="Role" />,
      cell: ({ row }) => {
        const membership = row.original;
        return (
          <Badge
            variant={
              membership.role === 'owner'
                ? 'default'
                : membership.role === 'admin'
                  ? 'secondary'
                  : 'outline'
            }
          >
            {membership.role === 'owner' && <Shield className="mr-1 h-3 w-3" />}
            {membership.role}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: () => <DataTableColumnHeader title="Joined" />,
      cell: ({ row }) => {
        return (
          <div className="text-muted-foreground text-sm">
            {format(new Date(row.original.createdAt), 'MMM d, yyyy')}
          </div>
        );
      },
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const membership = row.original;

        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(
                      membership.id,
                      membership.user.displayName,
                      membership.organization.name
                    );
                  }}
                  className="text-destructive hover:!text-destructive"
                >
                  <X className="text-destructive h-4 w-4" />
                  Remove from organization
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return columns;
}
