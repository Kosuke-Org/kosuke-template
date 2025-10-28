'use client';

// ❌ Violates: Types should NOT be defined inside hooks
interface UserData {
  id: number;
  name: string;
  email: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
}

// ❌ Violates: Don't manually define types that should be inferred
interface ApiResponse {
  success: boolean;
  data: unknown;
  error?: string;
}

export function useTestViolations() {
  // ❌ Violates: No type safety, using unknown without proper handling
  const processData = (data: any): any => {
    return data;
  };

  return {
    processData,
  };
}
