import { jest } from '@jest/globals';

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
  jest.mock('@clerk/nextjs/server', () => ({
    auth: jest.fn(() => Promise.resolve(mockClerkAuth)),
    clerkClient: {
      users: {
        getUser: jest.fn(() => Promise.resolve(mockClerkUserType)),
      },
    },
  }));

  // Mock Polar client
  jest.mock('@/lib/billing/client', () => ({
    polar: {
      checkouts: {
        create: jest.fn(() => Promise.resolve(mockPolarCheckout)),
      },
      subscriptions: {
        list: jest.fn(() => Promise.resolve({ items: [mockPolarSubscription] })),
        get: jest.fn(() => Promise.resolve(mockPolarSubscription)),
        cancel: jest.fn(() => Promise.resolve(mockPolarSubscription)),
        reactivate: jest.fn(() => Promise.resolve(mockPolarSubscription)),
      },
      webhooks: {
        constructEvent: jest.fn(() => mockPolarWebhookEvent),
      },
    },
  }));

  // Mock Next.js navigation
  jest.mock('next/navigation', () => ({
    redirect: jest.fn(),
    useRouter: jest.fn(() => ({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
    })),
    useSearchParams: jest.fn(() => new URLSearchParams()),
  }));

  // Mock fetch
  global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

  // Mock file operations
  jest.mock('@vercel/blob', () => ({
    put: jest.fn(() => Promise.resolve({ url: 'https://blob.vercel-storage.com/file.jpg' })),
    del: jest.fn(() => Promise.resolve()),
  }));

  // Mock email service
  jest.mock('resend', () => ({
    Resend: jest.fn().mockImplementation(() => ({
      emails: {
        send: jest.fn(() => Promise.resolve({ id: 'email_123' })),
      },
    })),
  }));
}

export function resetMocks() {
  jest.clearAllMocks();
}

// Helper to mock fetch responses
export function mockFetchResponse(data: unknown, status = 200) {
  (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response);
}

// Helper to mock fetch error
export function mockFetchError(error: string) {
  (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error(error));
}
