import type { Page } from '@playwright/test';

/**
 * Replaces the payload of specific tRPC procedures while letting every other
 * procedure in the same batch hit the real server.
 *
 * Used to keep third-party-backed data (Stripe pricing) out of the suite: the
 * page, the router, the auth gate and the rest of the tRPC calls stay real, only
 * the responses that would require live Stripe credentials are substituted.
 */
export async function stubTrpcProcedures(
  page: Page,
  stubs: Record<string, unknown>
): Promise<void> {
  await page.route('**/api/trpc/**', async (route) => {
    const url = new URL(route.request().url());
    // httpBatchLink puts the procedure names in the path: /api/trpc/a.b,c.d
    const procedures = decodeURIComponent(url.pathname.replace(/^.*\/api\/trpc\//, '')).split(',');

    if (!procedures.some((procedure) => procedure in stubs)) {
      return route.fallback();
    }

    const response = await route.fetch();
    const body = await response.json();
    // superjson is the tRPC transformer, so results are wrapped in `json`.
    const toResult = (value: unknown) => ({ result: { data: { json: value } } });

    const patched = Array.isArray(body)
      ? procedures.map((procedure, index) =>
          procedure in stubs ? toResult(stubs[procedure]) : body[index]
        )
      : toResult(stubs[procedures[0]]);

    await route.fulfill({ response, json: patched });
  });
}
