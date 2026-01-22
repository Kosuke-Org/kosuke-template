import { trpc } from '@/lib/trpc/client';

/**
 * Hook to check if Google AI API key is configured
 * Used to gate AI features (Documents, Assistant) when key is missing
 */
export function useGoogleApiKey() {
  const { data, isLoading } = trpc.organizations.checkGoogleApiKey.useQuery(undefined, {
    refetchOnMount: 'always',
  });

  return {
    isConfigured: data?.configured ?? false,
    isLoading,
  };
}
