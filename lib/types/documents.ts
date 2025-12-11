import type { inferRouterOutputs } from '@trpc/server';

import type { AppRouter } from '@/lib/trpc/router';

type RouterOutput = inferRouterOutputs<AppRouter>;

export type DocumentWithUser = RouterOutput['documents']['list']['documents'][number];
