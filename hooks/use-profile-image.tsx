'use client';

import { useMemo, createContext, useContext, ReactNode, useState } from 'react';
import type { UserResource } from '@clerk/types';

/**
 * Hook to handle profile image URLs from Clerk
 * Prioritizes custom uploaded images over Clerk's default images
 */
export function useProfileImageUrl(user?: UserResource | null) {
  const { currentImageUrl } = useProfileImage();

  return useMemo(() => {
    // Priority order:
    // 1. Current image URL from context (newly uploaded)
    // 2. Custom profile image from user metadata
    // 3. Clerk's default imageUrl
    if (currentImageUrl) return currentImageUrl;
    if (user?.publicMetadata?.customProfileImageUrl)
      return user.publicMetadata.customProfileImageUrl;
    return user?.imageUrl || null;
  }, [currentImageUrl, user?.publicMetadata?.customProfileImageUrl, user?.imageUrl]);
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
