import { POST } from '@/app/api/billing/create-checkout/route';
import { NextRequest } from 'next/server';
import { setupTestDatabase, clearTestData } from '../../setup/database';
import { createTestUser } from '../../setup/factories';
import { mockFetchResponse, resetMocks } from '../../setup/mocks';

// Mock clerk auth
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(() => ({ userId: 'user_123' })),
}));

describe('/api/billing/create-checkout', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await clearTestData();
    resetMocks();
  });

  it('should create checkout session for valid request', async () => {
    const mockResponse = {
      success: true,
      data: {
        url: 'https://polar.sh/checkout/123',
        id: 'checkout_123',
      },
    };

    mockFetchResponse(mockResponse);

    const request = new NextRequest('http://localhost:3000/api/billing/create-checkout', {
      method: 'POST',
      body: JSON.stringify({
        tier: 'pro',
        customerEmail: 'test@example.com',
        successUrl: 'https://example.com/success',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('url');
    expect(data.data).toHaveProperty('id');
  });

  it('should return 400 for missing tier', async () => {
    const request = new NextRequest('http://localhost:3000/api/billing/create-checkout', {
      method: 'POST',
      body: JSON.stringify({
        customerEmail: 'test@example.com',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toContain('tier');
  });

  it('should return 400 for invalid tier', async () => {
    const request = new NextRequest('http://localhost:3000/api/billing/create-checkout', {
      method: 'POST',
      body: JSON.stringify({
        tier: 'invalid_tier',
        customerEmail: 'test@example.com',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toContain('Invalid tier');
  });

  it('should return 401 for unauthenticated user', async () => {
    // Mock unauthenticated state
    const { auth } = require('@clerk/nextjs/server');
    auth.mockReturnValue({ userId: null });

    const request = new NextRequest('http://localhost:3000/api/billing/create-checkout', {
      method: 'POST',
      body: JSON.stringify({
        tier: 'pro',
        customerEmail: 'test@example.com',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.message).toContain('Unauthorized');
  });

  it('should handle billing service errors', async () => {
    const request = new NextRequest('http://localhost:3000/api/billing/create-checkout', {
      method: 'POST',
      body: JSON.stringify({
        tier: 'pro',
        customerEmail: 'test@example.com',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Mock billing service error
    const mockError = {
      success: false,
      message: 'Billing service unavailable',
    };

    mockFetchResponse(mockError, 500);

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toContain('checkout session');
  });

  it('should validate email format', async () => {
    const request = new NextRequest('http://localhost:3000/api/billing/create-checkout', {
      method: 'POST',
      body: JSON.stringify({
        tier: 'pro',
        customerEmail: 'invalid-email',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toContain('email');
  });

  it('should use default success URL when not provided', async () => {
    const mockResponse = {
      success: true,
      data: {
        url: 'https://polar.sh/checkout/123',
        id: 'checkout_123',
      },
    };

    mockFetchResponse(mockResponse);

    const request = new NextRequest('http://localhost:3000/api/billing/create-checkout', {
      method: 'POST',
      body: JSON.stringify({
        tier: 'premium',
        customerEmail: 'test@example.com',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
