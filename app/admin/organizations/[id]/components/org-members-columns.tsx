/**
 * Organization Members Table Column Definitions
 * Defines columns for users that belong to an organization
 */

'use client';

import { ColumnDef } from '@tanstack/react-table';
import type { inferRouterOutputs } from '@trpc/server';
import { format } from 'date-fns';
import { MoreHorizontal, Shield, User, X } from 'lucide-react';

import type { AppRouter } from '@/lib/trpc/router';
import { ORG_ROLES, type OrgRoleValue } from '@/lib/types/organization';

import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Infer MembershipWithDetails from tRPC router output
type RouterOutput = inferRouterOutputs<AppRouter>;
type MembershipWithDetails = RouterOutput['admin']['memberships']['list']['memberships'][number];

interface ColumnActionsProps {
  onRemove: (id: string, userName: string, orgName: string) => void;
  onView: (id: string) => void;
  onRoleChange: (id: string, role: OrgRoleValue) => void;
}

export function getOrgMembersColumns(
  actions: ColumnActionsProps
): ColumnDef<MembershipWithDetails>[] {
  const { onRemove, onView, onRoleChange } = actions;

  const columns: ColumnDef<MembershipWithDetails>[] = [
    {
      accessorKey: 'user.displayName',
      header: () => <DataTableColumnHeader title="User" />,
      cell: ({ row }) => {
        const membership = row.original;
        return <div className="font-medium">{membership.user.displayName}</div>;
      },
    },
    {
      accessorKey: 'user.email',
      header: () => <DataTableColumnHeader title="Email" />,
      cell: ({ row }) => row.original.user.email,
    },
    {
      accessorKey: 'role',
      header: () => <DataTableColumnHeader title="Role" />,
      cell: ({ row }) => {
        const membership = row.original;
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Select
              value={membership.role}
              onValueChange={(value: OrgRoleValue) => {
                onRoleChange(membership.id, value);
              }}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue>
                  <div className="flex items-center gap-1.5">
                    {membership.role === ORG_ROLES.OWNER && <Shield className="h-3 w-3" />}
                    <span className="capitalize">{membership.role}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-3 w-3" />
                    <span>Owner</span>
                  </div>
                </SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
                    onView(membership.user.id);
                  }}
                >
                  <User />
                  View Profile
                </DropdownMenuItem>
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
