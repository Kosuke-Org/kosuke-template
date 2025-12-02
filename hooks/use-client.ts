import { useSyncExternalStore } from 'react';

/**
 * Hook to check if the client is mounted
 * @returns {boolean} - True if the client is mounted, false otherwise
 */

export function useClient() {
  const isClient = useSyncExternalStore(
    () => () => {}, // subscribe (no-op)
    () => true, // getSnapshot (client) - always true
    () => false // getServerSnapshot (server) - always false
  );

  return { isClient };
}
