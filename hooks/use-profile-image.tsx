'use client';

import { ReactNode, createContext, useContext, useMemo, useState } from 'react';

import { User } from '@/lib/db/schema';

/**
 * Hook to handle profile image URLs
 */
export function useProfileImageUrl(user?: Partial<User>) {
  const { currentImageUrl } = useProfileImage();

  return useMemo(() => {
    if (currentImageUrl) return currentImageUrl;
    if (user?.profileImageUrl) return user.profileImageUrl;
    return null;
  }, [currentImageUrl, user?.profileImageUrl]);
}

// Profile Image Context for managing profile image state
const ProfileImageContext = createContext<{
  currentImageUrl: string | null;
  setCurrentImageUrl: (url: string | null) => void;
}>({
  currentImageUrl: null,
  setCurrentImageUrl: () => {},
});

export function ProfileImageProvider({ children }: { children: ReactNode }) {
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);

  return (
    <ProfileImageContext.Provider value={{ currentImageUrl, setCurrentImageUrl }}>
      {children}
    </ProfileImageContext.Provider>
  );
}

export function useProfileImage() {
  const context = useContext(ProfileImageContext);
  if (!context) {
    throw new Error('useProfileImage must be used within a ProfileImageProvider');
  }
  return context;
}
