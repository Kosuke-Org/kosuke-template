/**
 * tRPC API handler
 * Handles all tRPC requests
 */
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';

import { createTRPCContext } from '@/lib/trpc/init';
import { appRouter } from '@/lib/trpc/router';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: async () => createTRPCContext({ req }),
  });

export { handler as GET, handler as POST };
