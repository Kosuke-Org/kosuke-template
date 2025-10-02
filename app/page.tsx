'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Loader2 } from 'lucide-react';
import { useOrganizations } from '@/hooks/use-organizations';

export default function RootPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const { organizations, isLoading: isLoadingOrgs } = useOrganizations();

  useEffect(() => {
    if (!isLoaded) return;

    // Immediately redirect logged-out users (no loading state)
    if (!isSignedIn) {
      router.replace('/home');
      return;
    }

    // Handle logged-in users
    if (isLoadingOrgs) return;

    if (organizations.length > 0) {
      const firstOrg = organizations[0];
      router.replace(`/org/${firstOrg.slug}/dashboard`);
    } else {
      router.replace('/onboarding');
    }
  }, [isLoaded, isSignedIn, organizations, isLoadingOrgs, router]);

  // Only show loading for logged-in users
  if (isLoaded && isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Don't render anything for logged-out users - redirect happens immediately
  return null;
}
