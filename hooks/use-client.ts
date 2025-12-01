import { useSyncExternalStore } from 'react';

export function useClient() {
  const isClient = useSyncExternalStore(
    () => () => {}, // subscribe (no-op)
    () => true, // getSnapshot (client) - always true
    () => false // getServerSnapshot (server) - always false
  );

  return { isClient };
}
