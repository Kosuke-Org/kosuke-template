import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true, // Enables global APIs (describe, it, expect)
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['__tests__/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/.next/**', '__tests__/setup/**', '**/engine/**'],
    unstubEnvs: true,
    unstubGlobals: true,
    coverage: {
      provider: 'v8', // Faster than istanbul
      include: [
        'lib/**/*.{js,jsx,ts,tsx}',
        'hooks/**/*.{js,jsx,ts,tsx}',
        'components/ui/**/*.{js,jsx,ts,tsx}',
        'app/(logged-out)/home/**/*.{js,jsx,ts,tsx}',
      ],
      exclude: [
        // Core business logic exclusions
        'lib/db/**',
        'lib/email/**',
        'lib/auth/user-sync.ts',
        'lib/billing/operations.ts',
        'lib/billing/stripe-sync.ts',
        'lib/billing/cron-sync.ts',
        'lib/billing/subscription.ts',
        'lib/storage.ts',

        // API routes
        'app/api/**',

        // Complex components
        'components/app-sidebar.tsx',
        'components/skeletons.tsx',
        'components/ui/sidebar.tsx',
        'components/ui/chart.tsx',
        'components/ui/calendar.tsx',
        'components/ui/carousel.tsx',

        // Standard exclusions
        '**/*.d.ts',
        '**/node_modules/**',
        '**/.next/**',
        '**/coverage/**',
        'vitest.config.ts',
        'vitest.setup.ts',
        'tailwind.config.ts',
        'postcss.config.*',
        'next.config.ts',
        'drizzle.config.ts',
        '**/__tests__/**',
        '**/cli/**',
        'instrumentation*.ts',
        'middleware.ts',
        'sentry.*.ts',
      ],
      thresholds: {
        lines: 95,
        functions: 85,
        branches: 90,
        statements: 90,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
