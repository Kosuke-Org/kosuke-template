import type { Config } from 'jest';
import nextJest from 'next/jest';

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const config: Config = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  preset: 'ts-jest',
  moduleNameMapper: {
    // Handle module aliases (this is the fixed line)
    '^@/(.*)$': '<rootDir>/$1',
  },
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/__tests__/setup/',
  ],
  collectCoverageFrom: [
    // Core business logic - focus on these for 100% coverage
    'lib/**/*.{js,jsx,ts,tsx}',
    'hooks/**/*.{js,jsx,ts,tsx}',
    'components/ui/**/*.{js,jsx,ts,tsx}',
    'app/(logged-out)/home/**/*.{js,jsx,ts,tsx}',

    // Exclude complex/infrastructure files
    '!lib/db/**',
    '!lib/email/**',
    '!lib/auth/user-sync.ts',
    '!lib/billing/operations.ts',
    '!lib/billing/polar-sync.ts',
    '!lib/billing/cron-sync.ts',
    '!lib/billing/subscription.ts',
    '!lib/storage.ts',

    // Exclude API routes for now
    '!app/api/**',

    // Exclude complex components
    '!components/app-sidebar.tsx',
    '!components/skeletons.tsx',
    '!components/ui/sidebar.tsx',
    '!components/ui/chart.tsx',
    '!components/ui/calendar.tsx',
    '!components/ui/carousel.tsx',

    // Standard exclusions
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!jest.config.ts',
    '!jest.setup.ts',
    '!tailwind.config.ts',
    '!postcss.config.*',
    '!next.config.ts',
    '!drizzle.config.ts',
    '!**/__tests__/**',
    '!**/cli/**',
    '!instrumentation*.ts',
    '!middleware.ts',
    '!sentry.*.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 85,
      lines: 95,
      statements: 90,
    },
  },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config);
