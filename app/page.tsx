'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/home');
      }
    }
  }, [user, isLoaded, router]);

  return null;
}
