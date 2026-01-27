/// <reference types="vitest/globals" />
import '@testing-library/jest-dom';
import { vi } from 'vitest';

import { setupMocks } from './__tests__/setup/mocks';

// Mock the entire queue module to prevent worker initialization
vi.mock('@/lib/queue', async () => {
  return {
    // Mock only the parts that trigger worker initialization
    subscriptionWorker: { on: vi.fn(), close: vi.fn() },
    documentsWorker: { on: vi.fn(), close: vi.fn() },
    emailWorker: { on: vi.fn(), close: vi.fn() },
    // Mock queue functions
    addToMarketingSegmentJob: vi.fn(() => Promise.resolve()),
    removeFromMarketingSegmentJob: vi.fn(() => Promise.resolve()),
    addIndexDocumentJob: vi.fn(() => Promise.resolve()),
    addSubscriptionSyncJob: vi.fn(() => Promise.resolve()),
    scheduleSubscriptionSync: vi.fn(() => Promise.resolve()),
    scheduleAllJobs: vi.fn(() => Promise.resolve()),
  };
});

// Mock Redis client FIRST before any imports
vi.mock('@/lib/redis', () => ({
  redis: {
    get: vi.fn(() => Promise.resolve(null)),
    set: vi.fn(() => Promise.resolve('OK')),
    del: vi.fn(() => Promise.resolve(1)),
    quit: vi.fn(() => Promise.resolve('OK')),
    on: vi.fn(),
  },
  closeRedis: vi.fn(() => Promise.resolve()),
}));

// Mock BullMQ to prevent worker initialization during tests
// Note: We don't mock the Worker class to avoid interfering with Vitest's process communication
vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn(() => Promise.resolve({ id: 'mock-job-id' })),
    addBulk: vi.fn(() => Promise.resolve([])),
    getJob: vi.fn(() => Promise.resolve(null)),
    getJobs: vi.fn(() => Promise.resolve([])),
    close: vi.fn(() => Promise.resolve()),
    on: vi.fn(),
  })),
  Worker: class MockWorker {
    constructor() {
      // Empty constructor - don't access process or interfere with Vitest
    }
    on = vi.fn();
    close = vi.fn(() => Promise.resolve());
    run = vi.fn();
  },
  QueueEvents: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    close: vi.fn(() => Promise.resolve()),
  })),
}));

// Setup mocks before all tests
setupMocks();

// Mock IntersectionObserver which is not available in jsdom
if (typeof window !== 'undefined') {
  window.IntersectionObserver = class MockIntersectionObserver implements IntersectionObserver {
    readonly root: Element | null = null;
    readonly rootMargin: string = '0px';
    readonly thresholds: ReadonlyArray<number> = [0];

    constructor() {}
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  };
}

// Suppress console errors/warnings in test output
beforeAll(() => {
  console.error = vi.fn();
  console.warn = vi.fn();
});

// Setup environment variables for testing
process.env.TEST_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/kosuke_test';
process.env.POSTGRES_URL = 'postgresql://postgres:postgres@localhost:5432/kosuke_test';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.BETTER_AUTH_SECRET = 'test-secret-key-for-testing-only';
process.env.GOOGLE_AI_API_KEY = 'test-google-ai-api-key';
process.env.RESEND_API_KEY = 'test-resend-api-key';
process.env.ENCRYPTION_KEY = 'test-encryption-key-minimum-32-chars-long';
