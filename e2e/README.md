# Browser-level smoke suite

Playwright tests that verify the App Router surface a jsdom unit test cannot
reach: server/client boundaries, hydration, redirects and the authorization
gate. The Vitest suite in `__tests__/` still owns everything else — these specs
are deliberately few, and they are meant to stay that way.

A flaky browser check is worse than no browser check, because it teaches people
(and agents) to ignore a red CI job.

## Running it

```bash
# once, to download the browser
bunx playwright install --with-deps chromium

# the suite needs the deterministic seed users
bun run db:migrate
bun run db:seed

bun run test:e2e
```

Playwright starts its own dev server on port `3100` with an isolated build
directory (`.next-e2e`), so it can run while a normal `bun run dev` is up on
port 3000.

Useful flags:

```bash
bun run test:e2e -- --headed              # watch it run
bun run test:e2e -- --debug               # step through
bun run test:e2e -- e2e/billing.spec.ts   # a single spec
bun run test:e2e -- --ui                  # Playwright UI mode
```

To point the suite at an already-running app instead (a preview deployment, for
example), set `E2E_BASE_URL`; Playwright then skips its own server:

```bash
E2E_BASE_URL=https://my-preview.example.com bun run test:e2e
```

## What it covers

| Spec                    | Flow                                                                        |
| ----------------------- | --------------------------------------------------------------------------- |
| `auth.spec.ts`          | Email-OTP sign-in with a seeded user lands on the org dashboard             |
| `authorization.spec.ts` | Anonymous requests to `/org/...` and `/settings/...` redirect to sign-in    |
| `dashboard.spec.ts`     | `/org/[slug]/dashboard` renders real content; unknown slug hits `not-found` |
| `organizations.spec.ts` | Creating a workspace switches to it and lists it in the org switcher        |
| `billing.spec.ts`       | `/settings/billing` renders plan cards with an enabled checkout button      |
| `documents.spec.ts`     | Uploading a document makes it appear in the documents table                 |

`auth.setup.ts` signs the seeded users in once and saves their browser state to
`e2e/.auth/`, so the page-level specs skip the OTP round trip.

## Design notes

**Why `next dev` and not `next build && next start`.** Sign-in uses a fixed OTP
for `+kosuke_test@example.com` addresses, and `lib/auth/utils.ts` only honours
that when `NODE_ENV === 'development'`. A production build would leave the suite
with no way to authenticate.

**Why the suite is serial.** Every spec talks to the same database. `workers: 1`
and `fullyParallel: false` are correctness requirements, not a performance
choice.

**Which users to use.** `jane+kosuke_test@example.com` owns exactly one
organization, so her active org is deterministic — use her for anything
org-scoped. `john+kosuke_test@example.com` belongs to two, so his active org is
not guaranteed; he is reserved for the org-creation flow, which mutates state.

**Third-party services.** No spec calls a third-party API.

- Stripe: `e2e/support/trpc-stub.ts` replaces only `billing.isConfigured` and
  `billing.getPricing` in the tRPC response. Everything else in the same batch
  — subscription status, eligibility, org role — still hits the real server. The
  checkout button is asserted to exist and be enabled, never clicked.
- Google AI: the documents page is gated on `GOOGLE_AI_API_KEY` being present.
  `playwright.config.ts` supplies a placeholder. Indexing itself is queued out
  of band, so the upload assertion never depends on it.

**Data.** The suite does not reset the database, so anything it creates uses a
unique, timestamped name.
