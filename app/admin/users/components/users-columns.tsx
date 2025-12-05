'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { inferRouterOutputs } from '@trpc/server';
import { format } from 'date-fns';
import { MoreHorizontal, Trash2, User } from 'lucide-react';

import type { AppRouter } from '@/lib/trpc/router';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type RouterOutput = inferRouterOutputs<AppRouter>;
type UserWithDetails = RouterOutput['admin']['users']['list']['users'][number];

interface ActionsCallbacks {
  onView: (id: string) => void;
  onDelete: (id: string, email: string) => void;
}

export function getUsersColumns({
  onView,
  onDelete,
}: ActionsCallbacks): ColumnDef<UserWithDetails>[] {
  return [
    {
      accessorKey: 'displayName',
      header: 'Name',
      cell: ({ row }) => <div className="font-medium">{row.original.displayName}</div>,
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => row.original.email,
    },
    {
      accessorKey: 'emailVerified',
      header: 'Status',
      cell: ({ row }) => {
        const isVerified = row.original.emailVerified;
        return (
          <Badge variant={isVerified ? 'default' : 'secondary'}>
            {isVerified ? 'Verified' : 'Unverified'}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => format(row.original.createdAt, 'MMM d, yyyy'),
    },
    {
      id: 'actions',
      header: () => <div className="w-[70px]"></div>,
      cell: ({ row }) => {
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onView(row.original.id);
                  }}
                >
                  <User />
                  View Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive hover:!text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(row.original.id, row.original.email);
                  }}
                >
                  <Trash2 className="text-destructive" />
                  Delete User
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}
