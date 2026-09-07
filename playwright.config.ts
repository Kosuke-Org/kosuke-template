import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for the browser-level smoke suite.
 *
 * The suite is intentionally small: it covers the App Router surface that unit
 * tests cannot reach (server/client boundaries, hydration, redirects, auth
 * gating). Keep it fast and deterministic — a flaky browser check is worse than
 * no browser check.
 *
 * See e2e/README.md for how to run it locally.
 */
const isCI = !!process.env.CI;

/** Port for the Playwright-managed dev server. */
const PORT = Number(process.env.E2E_PORT ?? 3100);

/**
 * Where the tests point. Set E2E_BASE_URL to run against an already-running
 * app (a preview deployment, for example); Playwright then skips `webServer`.
 */
const externalBaseURL = process.env.E2E_BASE_URL;
const baseURL = externalBaseURL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  // Vitest owns __tests__/; Playwright must never pick those files up.
  testMatch: /.*\.(setup|spec)\.ts$/,
  // These specs share one database, so they must not race each other.
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: isCI ? [['html', { open: 'never' }], ['list']] : [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // The dev server compiles routes on demand, so first hits can be slow.
    navigationTimeout: 45_000,
    actionTimeout: 15_000,
  },
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts$/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium',
      testMatch: /.*\.spec\.ts$/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  ...(externalBaseURL
    ? {}
    : {
        webServer: {
          // Reuses the repo's own dev script. `next dev` is required (not
          // `build`+`start`) because the deterministic test OTP used to sign in
          // is only honoured when NODE_ENV === 'development'.
          command: `bun run dev --port ${PORT}`,
          url: baseURL,
          reuseExistingServer: !isCI,
          timeout: 180_000,
          stdout: 'pipe',
          stderr: 'pipe',
          env: {
            // Isolated build output so the e2e server can coexist with a dev server.
            NEXT_DIST_DIR: '.next-e2e',
            // Better Auth derives its baseURL and trusted origins from this.
            NEXT_PUBLIC_APP_URL: baseURL,
            // The documents page is gated on this key being present. Indexing
            // itself is queued out of band, so a placeholder is enough to
            // exercise the upload flow without calling Google.
            GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY ?? 'e2e-placeholder-key',
          },
        },
      }),
});
