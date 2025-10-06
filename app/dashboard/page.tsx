'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useOrganizations } from '@/hooks/use-organizations';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const { organizations, isLoading } = useOrganizations();

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.replace('/sign-in');
      return;
    }

    if (isLoading) return;

    if (organizations.length === 0) {
      router.replace('/onboarding');
    } else {
      const firstOrg = organizations[0];
      router.replace(`/org/${firstOrg.slug}/dashboard`);
    }
  }, [isLoaded, isSignedIn, organizations, isLoading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
