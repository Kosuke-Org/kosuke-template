'use client';

import { useMemo, createContext, useContext, ReactNode } from 'react';

/**
 * Hook to handle profile image URLs from Clerk
 * Clerk provides optimized image URLs that don't need additional processing
 */
export function useProfileImageUrl(imageUrl?: string | null) {
  return useMemo(() => {
    // Clerk handles image optimization automatically
    // Just return the URL as-is
    return imageUrl || null;
  }, [imageUrl]);
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
  // For now, this is a simple provider
  // In a more complex app, you might manage profile image state here
  const setCurrentImageUrl = () => {
    // This would update the profile image state
  };

  return (
    <ProfileImageContext.Provider value={{ currentImageUrl: null, setCurrentImageUrl }}>
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
