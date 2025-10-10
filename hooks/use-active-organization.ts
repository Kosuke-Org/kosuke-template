/**
 * Hook for managing the active organization
 * Uses Clerk's orgSlug from session as source of truth
 */

'use client';

import { useEffect } from 'react';
import { useAuth, useOrganizationList } from '@clerk/nextjs';
import { usePathname, useRouter } from 'next/navigation';
import { useOrganizations } from './use-organizations';
import type { Organization } from './use-organizations';

export function useActiveOrganization() {
  const { orgSlug } = useAuth();
  const { setActive } = useOrganizationList();
  const { organizations, isLoading } = useOrganizations();
  const router = useRouter();
  const pathname = usePathname();

  // Get active organization from Clerk's orgSlug (source of truth)
  const activeOrganization: Organization | null =
    organizations.find((org) => org.slug === orgSlug) ?? null;

  // Initialize: if user has orgs but no active org set, default to first
  useEffect(() => {
    if (isLoading || organizations.length === 0) return;

    // If no active org in Clerk session, set the first one
    if (!orgSlug) {
      const firstOrg = organizations[0];
      setActive?.({ organization: firstOrg.slug });
    }
  }, [orgSlug, organizations, isLoading, setActive]);

  // Sync Clerk's active org with URL slug
  useEffect(() => {
    if (isLoading || organizations.length === 0) return;

    // Extract org slug from URL
    const urlSlug = pathname.startsWith('/org/') ? pathname.split('/')[2] : null;

    // If URL has a different org than Clerk's active org, update Clerk
    if (urlSlug && urlSlug !== orgSlug) {
      const orgBySlug = organizations.find((org) => org.slug === urlSlug);
      if (orgBySlug) {
        setActive?.({ organization: orgBySlug.slug });
      }
    }
  }, [pathname, orgSlug, organizations, isLoading, setActive]);

  // Switch to a different organization
  const switchOrganization = (organizationId: string) => {
    const targetOrg = organizations.find((org) => org.id === organizationId);

    if (!targetOrg) {
      console.error('Organization not found:', organizationId);
      return;
    }

    // Update Clerk session (this is the source of truth)
    setActive?.({ organization: targetOrg.slug });

    // Update URL to include organization slug
    // If current path starts with /org/, replace the slug
    if (pathname.startsWith('/org/')) {
      const pathParts = pathname.split('/');
      pathParts[2] = targetOrg.slug; // Replace slug in /org/[slug]/...
      router.push(pathParts.join('/'));
    } else {
      // If not in an org-scoped path, navigate to the org dashboard
      router.push(`/org/${targetOrg.slug}/dashboard`);
    }
  };

  return {
    activeOrganization,
    activeOrgId: activeOrganization?.id ?? null,
    switchOrganization,
    isLoading: isLoading || (!activeOrganization && organizations.length > 0),
  };
}
