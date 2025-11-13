/// <reference types="vitest/globals" />
import '@testing-library/jest-dom';
import { setupMocks } from './__tests__/setup/mocks';
import { vi } from 'vitest';

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
