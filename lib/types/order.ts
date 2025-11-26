/**
 * Order types - Re-exports from schema
 * ALWAYS import from @/lib/types for consistent domain boundaries
 *
 * Extended types (OrderWithDetails, OrderStats, etc.) are inferred from tRPC router
 * Use: import type { AppRouter } from '@/lib/trpc/router'
 *      type OrderWithDetails = inferRouterOutputs<AppRouter>['orders']['list']['orders'][number]
 */
import { inferRouterOutputs } from '@trpc/server';

import { AppRouter } from '../trpc/router';

export type OrderHistoryOutput = inferRouterOutputs<AppRouter>['orders']['getHistory'];
