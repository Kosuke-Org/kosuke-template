import { vi } from 'vitest';
import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock Clerk auth
export const mockClerkUserType = {
  id: 'user_123',
  emailAddresses: [{ emailAddress: 'test@example.com' }],
  firstName: 'John',
  lastName: 'Doe',
  fullName: 'John Doe',
  imageUrl: 'https://example.com/avatar.jpg',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

export const mockClerkAuth = {
  userId: 'user_123',
  sessionId: 'session_123',
  user: mockClerkUserType,
};

// Mock Clerk webhook user
export const mockClerkWebhookUser = {
  id: 'user_123',
  email_addresses: [{ email_address: 'test@example.com' }],
  first_name: 'John',
  last_name: 'Doe',
  image_url: 'https://example.com/avatar.jpg',
  created_at: Date.now(),
  updated_at: Date.now(),
};

// Mock Polar responses
export const mockPolarCheckout = {
  id: 'checkout_123',
  url: 'https://polar.sh/checkout/123',
  status: 'open',
  products: ['product_123'],
  metadata: {},
};

export const mockPolarSubscription = {
  id: 'subscription_123',
  status: 'active',
  current_period_start: new Date().toISOString(),
  current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  customer_id: 'customer_123',
  product_id: 'product_123',
  price_id: 'price_123',
  metadata: { userId: 'user_123' },
};

export const mockPolarWebhookEvent = {
  type: 'subscription.created',
  data: mockPolarSubscription,
};

// Setup mocks
export function setupMocks() {
  // Mock Clerk
  vi.mock('@clerk/nextjs/server', () => ({
    auth: vi.fn(() => Promise.resolve(mockClerkAuth)),
    clerkClient: {
      users: {
        getUser: vi.fn(() => Promise.resolve(mockClerkUserType)),
      },
    },
  }));

  // Mock Polar client
  vi.mock('@/lib/billing/client', () => ({
    polar: {
      checkouts: {
        create: vi.fn(() => Promise.resolve(mockPolarCheckout)),
      },
      subscriptions: {
        list: vi.fn(() => Promise.resolve({ items: [mockPolarSubscription] })),
        get: vi.fn(() => Promise.resolve(mockPolarSubscription)),
        cancel: vi.fn(() => Promise.resolve(mockPolarSubscription)),
        reactivate: vi.fn(() => Promise.resolve(mockPolarSubscription)),
      },
      webhooks: {
        constructEvent: vi.fn(() => mockPolarWebhookEvent),
      },
    },
  }));

  // Mock Next.js navigation
  vi.mock('next/navigation', () => ({
    redirect: vi.fn(),
    useRouter: vi.fn(() => ({
      push: vi.fn(),
      replace: vi.fn(),
      back: vi.fn(),
    })),
    useSearchParams: vi.fn(() => new URLSearchParams()),
  }));

  // Mock fetch
  global.fetch = vi.fn() as typeof fetch;

  // Mock file operations
  vi.mock('@vercel/blob', () => ({
    put: vi.fn(() => Promise.resolve({ url: 'https://blob.vercel-storage.com/file.jpg' })),
    del: vi.fn(() => Promise.resolve()),
  }));

  // Mock email service
  vi.mock('resend', () => ({
    Resend: vi.fn().mockImplementation(() => ({
      emails: {
        send: vi.fn(() => Promise.resolve({ id: 'email_123' })),
      },
    })),
  }));
}

export function resetMocks() {
  vi.clearAllMocks();
}

// Helper to mock fetch responses
export function mockFetchResponse(data: unknown, status = 200) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response);
}

// Helper to mock fetch error
export function mockFetchError(error: string) {
  (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error(error));
}

// TanStack Query test wrapper
export function createQueryWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}
