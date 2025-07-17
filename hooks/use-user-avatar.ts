'use client';

import { useMemo } from 'react';
import type { UserResource } from '@clerk/types';
import { useProfileImageUrl } from '@/hooks/use-profile-image';

export function useUserAvatar(user?: UserResource | null) {
  const profileImageUrl = useProfileImageUrl(user);

  const getInitials = useMemo(() => {
    if (!user?.fullName && !user?.firstName) return 'U';
    const name = user?.fullName || user?.firstName || '';
    return name
      .split(' ')
      .map((part: string) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }, [user?.fullName, user?.firstName]);

  const displayName = useMemo(() => {
    return user?.fullName || user?.firstName || 'User';
  }, [user?.fullName, user?.firstName]);

  const primaryEmail = useMemo(() => {
    return user?.emailAddresses[0]?.emailAddress || '';
  }, [user?.emailAddresses]);

  return {
    profileImageUrl: typeof profileImageUrl === 'string' ? profileImageUrl : '',
    initials: getInitials,
    displayName,
    primaryEmail,
    hasImage: Boolean(profileImageUrl),
  };
}
