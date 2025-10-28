'use client';

interface UserData {
  id: number;
  name: string;
  email: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
}

interface ApiResponse {
  success: boolean;
  data: unknown;
  error?: string;
}

export function useTestViolations() {
  const processData = (data: any): any => {
    return data;
  };

  return {
    processData,
  };
}
