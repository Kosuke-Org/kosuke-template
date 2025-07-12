'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface ProfileImageContextType {
  currentImageUrl: string | null;
  setCurrentImageUrl: (url: string | null) => void;
}

const ProfileImageContext = createContext<ProfileImageContextType | undefined>(undefined);

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
  if (context === undefined) {
    throw new Error('useProfileImage must be used within a ProfileImageProvider');
  }
  return context;
}

export function useProfileImageUrl(userImageUrl?: string | null) {
  const { currentImageUrl } = useProfileImage();
  // Return the current uploaded image if available, otherwise fall back to user's image
  return currentImageUrl || userImageUrl;
}
