import { faker } from '@faker-js/faker';

export interface TestUser {
  id?: string;
  clerkUserId: string;
  email: string;
  displayName: string | null;
  profileImageUrl: string | null;
  lastSyncedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TestSubscription {
  id?: string;
  userId: string;
  polarSubscriptionId: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  tier: 'pro' | 'premium';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TestClerkUser {
  id: string;
  emailAddresses: Array<{ emailAddress: string }>;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  imageUrl: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface TestPolarSubscription {
  id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  customer_id: string;
  product_id: string;
  price_id: string;
  metadata: Record<string, unknown>;
}

// User factory
export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  return {
    clerkUserId: `user_${faker.string.alphanumeric(10)}`,
    email: faker.internet.email(),
    displayName: `${firstName} ${lastName}`,
    profileImageUrl: faker.image.avatar(),
    lastSyncedAt: faker.date.recent(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
}

// Subscription factory
export function createTestSubscription(
  overrides: Partial<TestSubscription> = {}
): TestSubscription {
  const startDate = faker.date.recent();
  const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

  return {
    userId: `user_${faker.string.alphanumeric(10)}`,
    polarSubscriptionId: `sub_${faker.string.alphanumeric(16)}`,
    status: faker.helpers.arrayElement(['active', 'canceled', 'past_due', 'trialing']),
    tier: faker.helpers.arrayElement(['pro', 'premium']),
    currentPeriodStart: startDate,
    currentPeriodEnd: endDate,
    cancelAtPeriodEnd: false,
    metadata: {},
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
}

// Clerk user factory
export function createTestClerkUser(overrides: Partial<TestClerkUser> = {}): TestClerkUser {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  return {
    id: `user_${faker.string.alphanumeric(10)}`,
    emailAddresses: [{ emailAddress: faker.internet.email() }],
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    imageUrl: faker.image.avatar(),
    createdAt: faker.date.past().getTime(),
    updatedAt: faker.date.recent().getTime(),
    ...overrides,
  };
}

// Polar subscription factory
export function createTestPolarSubscription(
  overrides: Partial<TestPolarSubscription> = {}
): TestPolarSubscription {
  const startDate = faker.date.recent();
  const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

  return {
    id: `sub_${faker.string.alphanumeric(16)}`,
    status: faker.helpers.arrayElement(['active', 'canceled', 'past_due', 'trialing']),
    current_period_start: startDate.toISOString(),
    current_period_end: endDate.toISOString(),
    customer_id: `cus_${faker.string.alphanumeric(12)}`,
    product_id: `prod_${faker.string.alphanumeric(12)}`,
    price_id: `price_${faker.string.alphanumeric(12)}`,
    metadata: { userId: `user_${faker.string.alphanumeric(10)}` },
    ...overrides,
  };
}

// Batch factories
export function createTestUsers(count: number, overrides: Partial<TestUser> = {}): TestUser[] {
  return Array.from({ length: count }, () => createTestUser(overrides));
}

export function createTestSubscriptions(
  count: number,
  overrides: Partial<TestSubscription> = {}
): TestSubscription[] {
  return Array.from({ length: count }, () => createTestSubscription(overrides));
}

// Relationship factories
export function createUserWithSubscription(
  userOverrides: Partial<TestUser> = {},
  subscriptionOverrides: Partial<TestSubscription> = {}
): { user: TestUser; subscription: TestSubscription } {
  const user = createTestUser(userOverrides);
  const subscription = createTestSubscription({
    userId: user.clerkUserId,
    ...subscriptionOverrides,
  });

  return { user, subscription };
}

// API response factories
export function createApiSuccessResponse<T>(data: T) {
  return {
    success: true,
    data,
    message: 'Operation completed successfully',
  };
}

export function createApiErrorResponse(message: string, code?: string) {
  return {
    success: false,
    message,
    error: code || 'UNKNOWN_ERROR',
  };
}

// Webhook event factories
export function createPolarWebhookEvent(type: string, data: unknown) {
  return {
    type,
    data,
    created_at: new Date().toISOString(),
  };
}

export function createClerkWebhookEvent(type: string, data: unknown) {
  return {
    type,
    data,
    object: 'event',
  };
}
