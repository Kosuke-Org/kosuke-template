import {
  getUserSubscription,
  updateUserSubscription,
  createUserSubscription,
  deleteUserSubscription,
  syncSubscriptionFromPolar,
} from '@/lib/billing/subscription';
import {
  createTestUser,
  createTestSubscription,
  createTestPolarSubscription,
} from '../../setup/factories';
import { setupTestDatabase, clearTestData, getTestDb } from '../../setup/database';
import { mockPolarSubscription } from '../../setup/mocks';

describe('Billing Subscription', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await clearTestData();
  });

  describe('getUserSubscription', () => {
    it('should return user subscription if exists', async () => {
      const testUser = createTestUser();
      const testSubscription = createTestSubscription({
        userId: testUser.clerkUserId,
        status: 'active',
        tier: 'pro',
      });

      const db = getTestDb();

      // Insert test user
      await db.insert(db.schema.users).values(testUser);

      // Insert test subscription
      await db.insert(db.schema.userSubscriptions).values({
        clerkUserId: testSubscription.userId,
        subscriptionId: testSubscription.polarSubscriptionId,
        productId: 'prod_123',
        status: testSubscription.status,
        tier: testSubscription.tier,
        currentPeriodStart: testSubscription.currentPeriodStart,
        currentPeriodEnd: testSubscription.currentPeriodEnd,
      });

      const result = await getUserSubscription(testUser.clerkUserId);

      expect(result).not.toBeNull();
      expect(result?.tier).toBe('pro');
      expect(result?.status).toBe('active');
    });

    it('should return null if user has no subscription', async () => {
      const result = await getUserSubscription('nonexistent_user');
      expect(result).toBeNull();
    });

    it('should return most recent subscription for user', async () => {
      const testUser = createTestUser();
      const db = getTestDb();

      await db.insert(db.schema.users).values(testUser);

      // Insert older subscription
      await db.insert(db.schema.userSubscriptions).values({
        clerkUserId: testUser.clerkUserId,
        subscriptionId: 'sub_old',
        status: 'canceled',
        tier: 'pro',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      });

      // Insert newer subscription
      await db.insert(db.schema.userSubscriptions).values({
        clerkUserId: testUser.clerkUserId,
        subscriptionId: 'sub_new',
        status: 'active',
        tier: 'premium',
        createdAt: new Date(), // now
      });

      const result = await getUserSubscription(testUser.clerkUserId);

      expect(result?.subscriptionId).toBe('sub_new');
      expect(result?.tier).toBe('premium');
    });
  });

  describe('createUserSubscription', () => {
    it('should create new subscription successfully', async () => {
      const testUser = createTestUser();
      const polarSubscription = createTestPolarSubscription({
        metadata: { userId: testUser.clerkUserId },
      });

      const db = getTestDb();
      await db.insert(db.schema.users).values(testUser);

      const result = await createUserSubscription(polarSubscription);

      expect(result.success).toBe(true);
      expect(result.subscription).toBeDefined();
      expect(result.subscription?.clerkUserId).toBe(testUser.clerkUserId);
    });

    it('should handle missing user metadata', async () => {
      const polarSubscription = createTestPolarSubscription({
        metadata: {}, // No userId
      });

      const result = await createUserSubscription(polarSubscription);

      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID not found');
    });

    it('should handle invalid user', async () => {
      const polarSubscription = createTestPolarSubscription({
        metadata: { userId: 'nonexistent_user' },
      });

      const result = await createUserSubscription(polarSubscription);

      expect(result.success).toBe(false);
      expect(result.error).toContain('User not found');
    });
  });

  describe('updateUserSubscription', () => {
    it('should update existing subscription', async () => {
      const testUser = createTestUser();
      const testSubscription = createTestSubscription({
        userId: testUser.clerkUserId,
        status: 'active',
      });

      const db = getTestDb();
      await db.insert(db.schema.users).values(testUser);

      const [inserted] = await db
        .insert(db.schema.userSubscriptions)
        .values({
          clerkUserId: testSubscription.userId,
          subscriptionId: testSubscription.polarSubscriptionId,
          status: testSubscription.status,
          tier: testSubscription.tier,
        })
        .returning();

      const updatedData = {
        status: 'canceled' as const,
        tier: 'premium' as const,
        canceledAt: new Date(),
      };

      const result = await updateUserSubscription(
        testSubscription.polarSubscriptionId,
        updatedData
      );

      expect(result.success).toBe(true);
      expect(result.subscription?.status).toBe('canceled');
      expect(result.subscription?.tier).toBe('premium');
    });

    it('should handle subscription not found', async () => {
      const result = await updateUserSubscription('nonexistent_sub', {
        status: 'canceled',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Subscription not found');
    });
  });

  describe('deleteUserSubscription', () => {
    it('should delete subscription successfully', async () => {
      const testUser = createTestUser();
      const testSubscription = createTestSubscription({
        userId: testUser.clerkUserId,
      });

      const db = getTestDb();
      await db.insert(db.schema.users).values(testUser);
      await db.insert(db.schema.userSubscriptions).values({
        clerkUserId: testSubscription.userId,
        subscriptionId: testSubscription.polarSubscriptionId,
        status: testSubscription.status,
        tier: testSubscription.tier,
      });

      const result = await deleteUserSubscription(testSubscription.polarSubscriptionId);

      expect(result.success).toBe(true);

      // Verify subscription is deleted
      const subscription = await getUserSubscription(testUser.clerkUserId);
      expect(subscription).toBeNull();
    });

    it('should handle subscription not found', async () => {
      const result = await deleteUserSubscription('nonexistent_sub');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Subscription not found');
    });
  });

  describe('syncSubscriptionFromPolar', () => {
    it('should sync subscription from Polar successfully', async () => {
      const testUser = createTestUser();
      const polarSubscription = createTestPolarSubscription({
        id: 'sub_polar_123',
        metadata: { userId: testUser.clerkUserId },
      });

      const db = getTestDb();
      await db.insert(db.schema.users).values(testUser);

      const result = await syncSubscriptionFromPolar(polarSubscription);

      expect(result.success).toBe(true);
      expect(result.subscription?.subscriptionId).toBe('sub_polar_123');
    });

    it('should update existing subscription during sync', async () => {
      const testUser = createTestUser();
      const existingSubscription = createTestSubscription({
        userId: testUser.clerkUserId,
        polarSubscriptionId: 'sub_existing',
        status: 'active',
      });

      const db = getTestDb();
      await db.insert(db.schema.users).values(testUser);
      await db.insert(db.schema.userSubscriptions).values({
        clerkUserId: existingSubscription.userId,
        subscriptionId: existingSubscription.polarSubscriptionId,
        status: existingSubscription.status,
        tier: existingSubscription.tier,
      });

      const updatedPolarSubscription = createTestPolarSubscription({
        id: 'sub_existing',
        status: 'canceled',
        metadata: { userId: testUser.clerkUserId },
      });

      const result = await syncSubscriptionFromPolar(updatedPolarSubscription);

      expect(result.success).toBe(true);
      expect(result.subscription?.status).toBe('canceled');
    });
  });
});
