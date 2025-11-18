import { TRPCError } from '@trpc/server';

import { createCaller } from '@/lib/trpc/server';

import NotFound from './not-found/not-found';

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const { slug } = await params;
  const caller = await createCaller();

  try {
    await caller.organizations.getOrganizationBySlug({
      organizationSlug: slug,
    });
  } catch (error) {
    if (error instanceof TRPCError && error.code === 'NOT_FOUND') {
      return <NotFound />;
    }

    throw error;
  }

  return <>{children}</>;
}
