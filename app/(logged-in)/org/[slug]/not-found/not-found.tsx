import { headers } from 'next/headers';

import { auth } from '@/lib/auth/providers';
import { createCaller } from '@/lib/trpc/server';

import { CreateOrganization } from '@/components/ui/create-organization';
import { OrganizationSelector } from '@/components/ui/organization-selector';

export default async function NotFound() {
  const caller = await createCaller();
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const organizations = await caller.organizations.getUserOrganizations({
    userId: session?.user?.id ?? '',
  });

  if (organizations.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold tracking-tight">Organization not found</h1>
          <p className="text-muted-foreground text-sm">
            This organization doesn&apos;t exist or you don&apos;t have access to it. Create a new
            organization to continue.
          </p>
        </div>
        <CreateOrganization />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <div className="text-center">
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Organization not found</h1>
        <p className="text-muted-foreground text-sm">
          This organization doesn&apos;t exist or you don&apos;t have access to it. Select an
          organization to continue.
        </p>
      </div>
      <OrganizationSelector />
    </div>
  );
}
