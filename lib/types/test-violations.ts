// ❌ VIOLATIONS OF CLAUDE.md - For testing purposes only

// 1. Using 'any' type (violates TypeScript guidelines)
export function processData(data: any) {
  return data.value * 2;
}

// 2. Manual type definition instead of inferring from tRPC router
export interface TaskInput {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
}

// 3. Type defined inside function (should be in lib/types)
export function useTestHook() {
  interface LocalSettings {
    emailNotifications: boolean;
    marketingEmails: boolean;
  }

  return { settings: {} as LocalSettings };
}

// 4. Manual enum instead of pgEnum from schema
export enum Status {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
}
