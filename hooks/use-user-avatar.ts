'use client';

import { useMemo } from 'react';
import { useProfileImageUrl } from '@/hooks/use-profile-image';
import { getInitials } from '@/lib/utils';
import type { User } from '@/lib/db/schema';

export function useUserAvatar(user?: Omit<User, 'clerkUserId'>) {
  const profileImageUrl = useProfileImageUrl(user);

  const displayName = useMemo(() => {
    return user?.displayName || 'User';
  }, [user?.displayName]);

  const initials = useMemo(() => {
    return getInitials(displayName);
  }, [displayName]);

  const primaryEmail = useMemo(() => {
    return user?.email || '';
  }, [user?.email]);

  return {
    profileImageUrl: typeof profileImageUrl === 'string' ? profileImageUrl : '',
    initials,
    displayName,
    primaryEmail,
    hasImage: Boolean(profileImageUrl),
  };
}
