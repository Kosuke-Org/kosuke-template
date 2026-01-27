#!/usr/bin/env tsx
/**
 * Database Seed Script
 *
 * This script populates the database with dummy data for development and testing.
 * It creates users, organizations, memberships, subscriptions, tasks, and activity logs.
 *
 * ⚠️ WARNING: This script should ONLY be run in development/test environments!
 *
 * Ensure you have run `bun run db:migrate` and `bun run db:push` before running this script.
 *
 * Usage: bun run db:seed
 */
import { faker } from '@faker-js/faker';
import { eq } from 'drizzle-orm';

import { getStripe } from '@/lib/billing/client';
import { withPrefix } from '@/lib/billing/lookup-keys';
import { db } from '@/lib/db/drizzle';
import type { NewOrder, OrderStatus } from '@/lib/types';
import { ORG_ROLES } from '@/lib/types/organization';

import {
  ActivityType,
  type NewActivityLog,
  type NewOrderHistory,
  type NewOrgMembership,
  type NewOrgSubscription,
  type NewOrganization,
  type NewTask,
  type NewUser,
  SubscriptionStatus,
  SubscriptionTier,
  type TaskPriority,
  activityLogs,
  orderHistory,
  orders,
  orgMemberships,
  orgSubscriptions,
  organizations,
  tasks,
  users,
} from '../schema';

if (process.env.NODE_ENV === 'production') {
  console.error('Error: Seed script cannot be run in production environment!');
  console.error('This script is for development and testing only.');
  process.exit(1);
}

console.log('🔒 Environment check passed: Running in development mode\n');

function calculatePeriodEnd(startDate: Date): Date {
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);
  return endDate;
}

async function seed() {
  console.log('🌱 Starting database seed...\n');
  console.log('📌 Note: If you encounter duplicate key errors, run `bun run db:reset`');
  const stripe = await getStripe();
  try {
    const janeSmithEmail = 'jane+kosuke_test@example.com';
    const johnDoeEmail = 'john+kosuke_test@example.com';

    console.log('� Creating users...');

    const johnNewUser: NewUser = {
      email: johnDoeEmail,
      displayName: 'John Doe',
      profileImageUrl: null,
      emailVerified: true,
      role: 'admin',
    };

    const janeNewUser: NewUser = {
      email: janeSmithEmail,
      displayName: 'Jane Smith',
      profileImageUrl: null,
      emailVerified: true,
      role: 'admin',
    };

    const [johnUser] = await db
      .insert(users)
      .values(johnNewUser)
      .onConflictDoUpdate({ target: users.email, set: johnNewUser })
      .returning();

    const [janeUser] = await db
      .insert(users)
      .values(janeNewUser)
      .onConflictDoUpdate({ target: users.email, set: janeNewUser })
      .returning();

    const org1Name = 'Jane Smith Co.';
    const org2Name = 'John Doe Ltd.';

    const org1Slug = 'jane-smith-co';
    const org2Slug = 'john-doe-ltd';

    const org1Data: NewOrganization = {
      name: org1Name,
      slug: org1Slug,
    };

    const org2Data: NewOrganization = {
      name: org2Name,
      slug: org2Slug,
    };

    // Insert or update organizations (in case they already exist from previous seed runs)
    const [insertedOrg1] = await db
      .insert(organizations)
      .values(org1Data)
      .onConflictDoUpdate({
        target: organizations.slug,
        set: org1Data,
      })
      .returning();

    const [insertedOrg2] = await db
      .insert(organizations)
      .values(org2Data)
      .onConflictDoUpdate({
        target: organizations.slug,
        set: org2Data,
      })
      .returning();

    const johnMembershipData: NewOrgMembership = {
      organizationId: insertedOrg1.id,
      createdAt: new Date(),
      userId: johnUser.id,
      role: ORG_ROLES.MEMBER,
    };

    const janeMembershipData: NewOrgMembership = {
      organizationId: insertedOrg1.id,
      createdAt: new Date(),
      userId: janeUser.id,
      role: ORG_ROLES.OWNER,
    };

    const johnOrg2MembershipData: NewOrgMembership = {
      organizationId: insertedOrg2.id,
      createdAt: new Date(),
      userId: johnUser.id,
      role: ORG_ROLES.OWNER,
    };

    // Insert or skip memberships if they already exist
    for (const membership of [janeMembershipData, johnMembershipData, johnOrg2MembershipData]) {
      await db.insert(orgMemberships).values(membership).onConflictDoNothing();
    }

    console.log(`  ✅ Jane is owner of ${org1Name}`);
    console.log(`  ✅ John is member of ${org1Name}`);
    console.log(`  ✅ John is owner of ${org2Name}\n`);

    // Step 6: Create subscriptions with Stripe customers and subscriptions
    console.log('💳 Creating subscriptions...');

    // Fetch Stripe free tier price using lookup key (with prefix if configured)
    let freePriceId: string | null = null;

    try {
      const freeTierLookupKey = withPrefix(SubscriptionTier.FREE_MONTHLY);
      console.log(
        `  🔍 Fetching free tier price from Stripe (lookup key: ${freeTierLookupKey})...`
      );

      const freePrices = await stripe.prices.list({
        lookup_keys: [freeTierLookupKey],
        limit: 1,
        active: true,
      });
      freePriceId = freePrices.data[0]?.id || null;

      console.log(`  ✅ Found Stripe price ID: ${freePriceId || 'not found'}`);
    } catch (error) {
      console.warn(
        '  ⚠️  Could not fetch Stripe prices. Subscriptions will be created without Stripe data.'
      );
      console.warn(
        '     Make sure to run `bun run stripe:seed` first to create products in Stripe.'
      );
      console.warn('     Error:', error instanceof Error ? error.message : error);
    }

    // Create subscription for Jane's organization (Free tier - with Stripe customer and subscription)
    let janeOrgSubscription: NewOrgSubscription;

    if (freePriceId) {
      try {
        console.log("  🔄 Creating Stripe customer and subscription for Jane's organization...");

        // Create Stripe customer for organization
        const org1StripeCustomer = await stripe.customers.create({
          email: janeSmithEmail,
          name: org1Name,
          metadata: {
            organizationId: insertedOrg1.id,
          },
        });

        // Update organization with Stripe customer ID
        await db
          .update(organizations)
          .set({ stripeCustomerId: org1StripeCustomer.id, updatedAt: new Date() })
          .where(eq(organizations.id, insertedOrg1.id));

        console.log(`  ✅ Created Stripe customer: ${org1StripeCustomer.id}`);

        // Create Stripe subscription
        const org1StripeSubscription = await stripe.subscriptions.create({
          customer: org1StripeCustomer.id,
          items: [{ price: freePriceId }],
          metadata: {
            organizationId: insertedOrg1.id,
            tier: SubscriptionTier.FREE_MONTHLY,
          },
          // For free plans, we need to explicitly set collection_method to avoid payment method requirements
          collection_method: 'send_invoice',
          days_until_due: 0,
        });

        console.log(`  ✅ Created Stripe subscription: ${org1StripeSubscription.id}`);
        console.log(`  ℹ️  Stripe returned status: ${org1StripeSubscription.status}`);

        // Create database record with Stripe data
        const periodStart = new Date();
        janeOrgSubscription = {
          organizationId: insertedOrg1.id,
          status: SubscriptionStatus.ACTIVE, // Force active for free tier (Stripe may return 'incomplete' without payment method)
          tier: SubscriptionTier.FREE_MONTHLY,
          stripeCustomerId: org1StripeCustomer.id,
          stripeSubscriptionId: org1StripeSubscription.id,
          stripePriceId: freePriceId,
          currentPeriodStart: periodStart,
          currentPeriodEnd: calculatePeriodEnd(periodStart),
          cancelAtPeriodEnd: 'false',
        };

        await db.insert(orgSubscriptions).values([janeOrgSubscription]);
        console.log(`  ✅ ${org1Name}: Free tier (synced from Stripe)`);
      } catch (error) {
        console.warn('  ⚠️  Failed to create Stripe customer/subscription for organization');
        console.warn('     Organization will use free tier by default (no subscription record)');
        console.warn('     Error:', error instanceof Error ? error.message : error);
      }
    } else {
      // No Stripe prices available - organization will use free tier by default
      console.log(`  ℹ️  ${org1Name}: No Stripe prices found - will use free tier by default`);
    }

    // Create subscription for John's organization (Free tier - with Stripe customer and subscription)
    let johnOrgSubscription: NewOrgSubscription;

    if (freePriceId) {
      try {
        console.log("  🔄 Creating Stripe customer and subscription for John's organization...");

        // Create Stripe customer for organization
        const org2StripeCustomer = await stripe.customers.create({
          email: johnDoeEmail,
          name: org2Name,
          metadata: {
            organizationId: insertedOrg2.id,
          },
        });

        // Update organization with Stripe customer ID
        await db
          .update(organizations)
          .set({ stripeCustomerId: org2StripeCustomer.id, updatedAt: new Date() })
          .where(eq(organizations.id, insertedOrg2.id));

        console.log(`  ✅ Created Stripe customer: ${org2StripeCustomer.id}`);

        // Create Stripe subscription
        const org2StripeSubscription = await stripe.subscriptions.create({
          customer: org2StripeCustomer.id,
          items: [{ price: freePriceId }],
          metadata: {
            organizationId: insertedOrg2.id,
            tier: SubscriptionTier.FREE_MONTHLY,
          },
          // For free plans, we need to explicitly set collection_method to avoid payment method requirements
          collection_method: 'send_invoice',
          days_until_due: 0,
        });

        console.log(`  ✅ Created Stripe subscription: ${org2StripeSubscription.id}`);
        console.log(`  ℹ️  Stripe returned status: ${org2StripeSubscription.status}`);

        const periodStart = new Date();
        johnOrgSubscription = {
          organizationId: insertedOrg2.id,
          status: SubscriptionStatus.ACTIVE, // Force active for free tier (Stripe may return 'incomplete' without payment method)
          tier: SubscriptionTier.FREE_MONTHLY,
          stripeCustomerId: org2StripeCustomer.id,
          stripeSubscriptionId: org2StripeSubscription.id,
          stripePriceId: freePriceId,
          currentPeriodStart: periodStart,
          currentPeriodEnd: calculatePeriodEnd(periodStart),
          cancelAtPeriodEnd: 'false',
        };

        await db.insert(orgSubscriptions).values([johnOrgSubscription]);
        console.log(`  ✅ ${org2Name}: Free tier (synced from Stripe)`);
      } catch (error) {
        console.warn('  ⚠️  Failed to create Stripe customer/subscription for organization');
        console.warn('     Organization will use free tier by default (no subscription record)');
        console.warn('     Error:', error instanceof Error ? error.message : error);
      }
    } else {
      // No Stripe prices available - organization will use free tier by default
      console.log(`  ℹ️  ${org2Name}: No Stripe prices found - will use free tier by default`);
    }

    // Step 7: Create tasks
    console.log('📝 Creating tasks...');

    const taskPriorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

    // Personal tasks for Jane
    const janePersonalTasks: NewTask[] = Array.from({ length: 5 }, (_, i) => ({
      userId: janeUser.id,
      title: faker.lorem.sentence({ min: 3, max: 6 }),
      description: faker.lorem.paragraph(),
      completed: i % 3 === 0 ? 'true' : 'false',
      priority: taskPriorities[i % 4],
      dueDate: faker.date.future(),
    }));

    // Organization tasks for org1
    const org1Tasks: NewTask[] = Array.from({ length: 5 }, (_, i) => ({
      userId: i % 2 === 0 ? janeUser.id : johnUser.id,
      organizationId: insertedOrg1.id,
      title: faker.lorem.sentence({ min: 3, max: 6 }),
      description: faker.lorem.paragraph(),
      completed: i % 4 === 0 ? 'true' : 'false',
      priority: taskPriorities[i % 4],
      dueDate: faker.date.future(),
    }));

    // Personal tasks for John
    const johnPersonalTasks: NewTask[] = Array.from({ length: 5 }, (_, i) => ({
      userId: johnUser.id,
      title: faker.lorem.sentence({ min: 3, max: 6 }),
      description: faker.lorem.paragraph(),
      completed: i % 2 === 0 ? 'true' : 'false',
      priority: taskPriorities[i % 4],
      dueDate: faker.date.future(),
    }));

    // Organization tasks for org2
    const org2Tasks: NewTask[] = Array.from({ length: 5 }, (_, i) => ({
      userId: johnUser.id,
      organizationId: insertedOrg2.id,
      title: faker.lorem.sentence({ min: 3, max: 6 }),
      description: faker.lorem.paragraph(),
      completed: i % 3 === 0 ? 'true' : 'false',
      priority: taskPriorities[i % 4],
      dueDate: faker.date.future(),
    }));

    await db
      .insert(tasks)
      .values([...janePersonalTasks, ...org1Tasks, ...johnPersonalTasks, ...org2Tasks]);

    console.log('  ✅ Created 5 personal tasks for Jane');
    console.log(`  ✅ Created 5 organization tasks for ${org1Name}`);
    console.log('  ✅ Created 5 personal tasks for John');
    console.log(`  ✅ Created 5 organization tasks for ${org2Name}\n`);

    // Step 8: Create activity logs
    console.log('📊 Creating activity logs...');

    const activityTypes = [
      ActivityType.SIGN_IN,
      ActivityType.UPDATE_PROFILE,
      ActivityType.PROFILE_IMAGE_UPDATED,
      ActivityType.UPDATE_PREFERENCES,
      ActivityType.ORG_CREATED,
      ActivityType.ORG_MEMBER_ADDED,
      ActivityType.SUBSCRIPTION_CREATED,
    ];

    const janeActivities: NewActivityLog[] = Array.from({ length: 5 }, (_, i) => ({
      userId: janeUser.id,
      action: activityTypes[i % activityTypes.length],
      timestamp: faker.date.recent({ days: 30 }),
      ipAddress: faker.internet.ipv4(),
      metadata: JSON.stringify({
        userAgent: faker.internet.userAgent(),
        location: faker.location.city(),
      }),
    }));

    const johnActivities: NewActivityLog[] = Array.from({ length: 5 }, (_, i) => ({
      userId: johnUser.id,
      action: activityTypes[i % activityTypes.length],
      timestamp: faker.date.recent({ days: 30 }),
      ipAddress: faker.internet.ipv4(),
      metadata: JSON.stringify({
        userAgent: faker.internet.userAgent(),
        location: faker.location.city(),
      }),
    }));

    await db.insert(activityLogs).values([...janeActivities, ...johnActivities]);

    console.log('  ✅ Created 5 activity logs for Jane');
    console.log('  ✅ Created 5 activity logs for John\n');

    // Step 9: Create orders
    console.log('🛒 Creating orders...');

    const orderStatuses: OrderStatus[] = [
      'pending',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
    ];

    // Orders for org1 (Jane's organization)
    const org1Orders: NewOrder[] = Array.from({ length: 15 }, (_, i) => {
      const amount = faker.number.float({ min: 50, max: 5000, fractionDigits: 2 }).toFixed(2);
      const orderDate = faker.date.recent({ days: 60 });

      return {
        // orderNumber will be auto-generated by database as UUID
        customerName: faker.person.fullName(),
        userId: i % 2 === 0 ? janeUser.id : johnUser.id,
        organizationId: insertedOrg1.id,
        status: orderStatuses[i % orderStatuses.length],
        amount,
        currency: 'USD',
        orderDate,
        notes: i % 3 === 0 ? faker.lorem.sentence() : null,
        createdAt: orderDate,
      };
    });

    // Orders for org2 (John's organization)
    const org2Orders: NewOrder[] = Array.from({ length: 15 }, (_, i) => {
      const amount = faker.number.float({ min: 50, max: 5000, fractionDigits: 2 }).toFixed(2);
      const orderDate = faker.date.recent({ days: 60 });

      return {
        // orderNumber will be auto-generated by database as UUID
        customerName: faker.person.fullName(),
        userId: johnUser.id,
        organizationId: insertedOrg2.id,
        status: orderStatuses[i % orderStatuses.length],
        amount,
        currency: 'USD',
        orderDate,
        notes: i % 4 === 0 ? faker.lorem.sentence() : null,
        createdAt: orderDate,
      };
    });

    const insertedOrders = await db
      .insert(orders)
      .values([...org1Orders, ...org2Orders])
      .returning();

    console.log(`  ✅ Created 15 orders for ${org1Name}`);
    console.log(`  ✅ Created 15 orders for ${org2Name}\n`);

    // Step 10: Create order history
    console.log('📜 Creating order history...');

    const statusProgression: Record<OrderStatus, OrderStatus[]> = {
      pending: ['pending'],
      processing: ['pending', 'processing'],
      shipped: ['pending', 'processing', 'shipped'],
      delivered: ['pending', 'processing', 'shipped', 'delivered'],
      cancelled: ['pending', 'cancelled'],
    };

    const statusNotes: Record<OrderStatus, string[]> = {
      pending: ['Order created', 'Order received', 'Payment pending'],
      processing: [
        'Payment confirmed',
        'Order is being prepared',
        'Items being packaged',
        'Quality check in progress',
      ],
      shipped: [
        'Order shipped',
        'Package handed to carrier',
        'Out for delivery',
        'In transit to destination',
      ],
      delivered: [
        'Order delivered successfully',
        'Package delivered to customer',
        'Signed for delivery',
        'Left at front door',
      ],
      cancelled: [
        'Order cancelled by customer',
        'Order cancelled - payment failed',
        'Order cancelled - out of stock',
        'Cancelled due to customer request',
      ],
    };

    const allHistoryEntries: NewOrderHistory[] = [];

    for (const order of insertedOrders) {
      const progression = statusProgression[order.status];
      const orderDate = new Date(order.orderDate);

      // Calculate total days needed for all statuses
      const totalStatuses = progression.length;

      for (let i = 0; i < totalStatuses; i++) {
        const status = progression[i];
        const notes = statusNotes[status];
        const note = notes[Math.floor(Math.random() * notes.length)];

        // Calculate timestamps: start from oldest (first status) to newest (current status)
        // Work backwards from order date: last status is closest to orderDate
        const statusesFromEnd = totalStatuses - 1 - i;
        const daysOffset = statusesFromEnd * faker.number.int({ min: 1, max: 3 });
        const hoursOffset = faker.number.int({ min: 1, max: 12 });
        const statusDate = new Date(orderDate);
        statusDate.setDate(statusDate.getDate() - daysOffset);
        statusDate.setHours(statusDate.getHours() - hoursOffset);

        // 30% chance of system update (null userId), 70% chance of user update
        const isSystemUpdate = Math.random() < 0.3;
        const userId = isSystemUpdate ? null : order.userId;

        allHistoryEntries.push({
          orderId: order.id,
          userId,
          status,
          notes: note,
          createdAt: statusDate,
        });
      }
    }

    await db.insert(orderHistory).values(allHistoryEntries);

    console.log(`  ✅ Created ${allHistoryEntries.length} order history entries\n`);

    console.log('✅ Database seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log('  • 2 users created');
    console.log('  • 2 organizations created');
    console.log('  • 3 organization memberships created');
    console.log('  • 2 subscriptions created');
    console.log('  • 20 tasks created');
    console.log('  • 10 activity logs created');
    console.log('  • 30 orders created');
    console.log(`  • ${allHistoryEntries.length} order history entries created\n`);
    console.log('🔑 Test Users:');
    console.log(`  • ${janeSmithEmail} (Admin of ${org1Name})`);
    console.log(`  • ${johnDoeEmail} (Admin of ${org2Name}, Member of ${org1Name})\n`);
    console.log(
      "    To log in with the test users, use Kosuke's verification code: \x1b[1m424242\x1b[0m"
    );
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

seed()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
