'use client';

import { useEffect, useState } from 'react';
import { User } from '@/lib/db/schema';

type UserInfo = {
  user: Partial<User> | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
};

export function useUserInfo(): UserInfo {
  const [user, setUser] = useState<Partial<User> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const refresh = () => {
    setRefreshCounter((prev) => prev + 1);
  };

  useEffect(() => {
    async function fetchUserData() {
      try {
        setLoading(true);
        const response = await fetch('/api/user');

        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }

        const userData = await response.json();
        setUser(userData);
        setError(null);
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    }

    fetchUserData();
  }, [refreshCounter]);

  return { user, loading, error, refresh };
}
