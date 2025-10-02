'use client';

import { useMemo } from 'react';
import type { UserResource } from '@clerk/types';
import { useProfileImageUrl } from '@/hooks/use-profile-image';
import { getInitials } from '@/lib/utils';

export function useUserAvatar(user?: UserResource | null) {
  const profileImageUrl = useProfileImageUrl(user);

  const displayName = useMemo(() => {
    return user?.fullName || user?.firstName || 'User';
  }, [user?.fullName, user?.firstName]);

  const initials = useMemo(() => {
    return getInitials(displayName);
  }, [displayName]);

  const primaryEmail = useMemo(() => {
    return user?.emailAddresses[0]?.emailAddress || '';
  }, [user?.emailAddresses]);

  return {
    profileImageUrl: typeof profileImageUrl === 'string' ? profileImageUrl : '',
    initials,
    displayName,
    primaryEmail,
    hasImage: Boolean(profileImageUrl),
  };
}
