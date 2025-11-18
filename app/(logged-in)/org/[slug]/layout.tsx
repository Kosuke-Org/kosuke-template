import { createCaller } from '@/lib/trpc/server';

import OrganisationNotFound from './not-found/organisation-not-found';

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
  } catch {
    return <OrganisationNotFound />;
  }

  return <>{children}</>;
}
