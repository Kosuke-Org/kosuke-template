'use client';

import Link from 'next/link';

import { ChevronsUpDown } from 'lucide-react';

import { organization } from '@/lib/auth/client';
import { getInitials } from '@/lib/utils';

import { useOrganizations } from '@/hooks/use-organizations';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const OrganizationSelector = () => {
  const { organizations } = useOrganizations();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          Select an organization
          <ChevronsUpDown className="ml-auto size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) rounded-lg">
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            asChild
            onSelect={async () => {
              await organization.setActive({
                organizationId: org.id,
                organizationSlug: org.slug,
              });
            }}
          >
            <Link
              href={`/org/${org.slug}/dashboard`}
              className="flex cursor-pointer items-center gap-2 p-2"
            >
              <Avatar className="h-6 w-6 rounded-md">
                {org.logo && <AvatarImage src={org.logo} alt={org.name} />}
                <AvatarFallback className="bg-primary text-primary-foreground rounded-md text-xs">
                  {getInitials(org.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="text-sm font-medium">{org.name}</div>
              </div>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
