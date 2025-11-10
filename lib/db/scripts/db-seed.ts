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
import { db } from '@/lib/db/drizzle';
import {
  users,
  organizations,
  orgMemberships,
  userSubscriptions,
  tasks,
  activityLogs,
  orders,
  ActivityType,
  SubscriptionTier,
  SubscriptionStatus,
  type NewUser,
  type NewOrganization,
  type NewOrgMembership,
  type NewUserSubscription,
  type NewTask,
  type NewActivityLog,
  type TaskPriority,
} from '../schema';

import type { NewOrder, OrderStatus } from '@/lib/types/order';
import { ORG_ROLES } from '@/lib/types/organization';

const IS_PRODUCTION =
  process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

if (IS_PRODUCTION) {
  console.error('Error: Seed script cannot be run in production environment!');
  console.error('This script is for development and testing only.');
  process.exit(1);
}

console.log('🔒 Environment check passed: Running in development mode\n');

async function seed() {
  console.log('🌱 Starting database seed...\n');
  console.log('📌 Note: If you encounter duplicate key errors, run `bun run db:reset`');

  try {
    const janeSmithEmail = 'jane+kosuke_test@example.com';
    const johnDoeEmail = 'john+kosuke_test@example.com';

    console.log('� Creating users...');

    const johnNewUser: NewUser = {
      email: johnDoeEmail,
      displayName: 'John Doe',
      profileImageUrl: null,
      emailVerified: true,
    };

    const janeNewUser: NewUser = {
      email: janeSmithEmail,
      displayName: 'Jane Smith',
      profileImageUrl: null,
      emailVerified: true,
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
      role: ORG_ROLES.ADMIN,
    };

    const johnOrg2MembershipData: NewOrgMembership = {
      organizationId: insertedOrg2.id,
      createdAt: new Date(),
      userId: johnUser.id,
      role: ORG_ROLES.ADMIN,
    };

    // Insert or skip memberships if they already exist
    for (const membership of [janeMembershipData, johnMembershipData, johnOrg2MembershipData]) {
      await db.insert(orgMemberships).values(membership).onConflictDoNothing();
    }

    console.log(`  ✅ Jane is admin of ${org1Name}`);
    console.log(`  ✅ John is member of ${org1Name}`);
    console.log(`  ✅ John is admin of ${org2Name}\n`);

    // Step 6: Create subscriptions
    console.log('💳 Creating subscriptions...');

    const janeSubscription: NewUserSubscription = {
      userId: janeUser.id,
      organizationId: insertedOrg1.id,
      subscriptionType: 'organization',
      status: SubscriptionStatus.ACTIVE,
      tier: SubscriptionTier.FREE,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      stripePriceId: null,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      cancelAtPeriodEnd: 'false',
    };

    const johnSubscription: NewUserSubscription = {
      userId: johnUser.id,
      organizationId: insertedOrg2.id,
      subscriptionType: 'organization',
      status: SubscriptionStatus.ACTIVE,
      tier: SubscriptionTier.FREE,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      stripePriceId: null,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      cancelAtPeriodEnd: 'false',
    };

    await db.insert(userSubscriptions).values([janeSubscription, johnSubscription]);

    console.log(`  ✅ ${org1Name}: Business tier`);
    console.log(`  ✅ ${org2Name}: Pro tier\n`);

    // Step 7: Create tasks
    console.log('📝 Creating tasks...');

    const taskPriorities: TaskPriority[] = ['low', 'medium', 'high'];

    // Personal tasks for Jane
    const janePersonalTasks: NewTask[] = Array.from({ length: 5 }, (_, i) => ({
      userId: janeUser.id,
      title: faker.lorem.sentence({ min: 3, max: 6 }),
      description: faker.lorem.paragraph(),
      completed: i % 3 === 0 ? 'true' : 'false',
      priority: taskPriorities[i % 3],
      dueDate: faker.date.future(),
    }));

    // Organization tasks for org1
    const org1Tasks: NewTask[] = Array.from({ length: 5 }, (_, i) => ({
      userId: i % 2 === 0 ? janeUser.id : johnUser.id,
      organizationId: insertedOrg1.id,
      title: faker.lorem.sentence({ min: 3, max: 6 }),
      description: faker.lorem.paragraph(),
      completed: i % 4 === 0 ? 'true' : 'false',
      priority: taskPriorities[i % 3],
      dueDate: faker.date.future(),
    }));

    // Personal tasks for John
    const johnPersonalTasks: NewTask[] = Array.from({ length: 5 }, (_, i) => ({
      userId: johnUser.id,
      title: faker.lorem.sentence({ min: 3, max: 6 }),
      description: faker.lorem.paragraph(),
      completed: i % 2 === 0 ? 'true' : 'false',
      priority: taskPriorities[i % 3],
      dueDate: faker.date.future(),
    }));

    // Organization tasks for org2
    const org2Tasks: NewTask[] = Array.from({ length: 5 }, (_, i) => ({
      userId: johnUser.id,
      organizationId: insertedOrg2.id,
      title: faker.lorem.sentence({ min: 3, max: 6 }),
      description: faker.lorem.paragraph(),
      completed: i % 3 === 0 ? 'true' : 'false',
      priority: taskPriorities[i % 3],
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

    await db.insert(orders).values([...org1Orders, ...org2Orders]);

    console.log(`  ✅ Created 15 orders for ${org1Name}`);
    console.log(`  ✅ Created 15 orders for ${org2Name}\n`);

    console.log('✅ Database seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log('  • 2 users created');
    console.log('  • 2 organizations created');
    console.log('  • 3 organization memberships created');
    console.log('  • 2 subscriptions created');
    console.log('  • 20 tasks created');
    console.log('  • 10 activity logs created');
    console.log('  • 30 orders created\n');
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
