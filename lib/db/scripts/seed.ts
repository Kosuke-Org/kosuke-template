#!/usr/bin/env tsx
/**
 * Database Seed Script
 *
 * This script populates the database with dummy data for development and testing.
 * It creates users in Clerk, organizations, subscriptions, tasks, and activity logs.
 *
 * ⚠️ WARNING: This script should ONLY be run in development/test environments!
 *
 * Ensure you have run `pnpm run db:migrate` and `pnpm run db:push` before running this script.
 *
 * Usage: pnpm run db:seed
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
  ActivityType,
  SubscriptionTier,
  SubscriptionStatus,
  type NewUser,
  type NewOrganization,
  type NewOrgMembership,
  type NewUserSubscription,
  type NewTask,
  type NewActivityLog,
} from '../schema';

/**
 * Generate a URL-safe slug from a name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

const IS_PRODUCTION =
  process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

if (IS_PRODUCTION) {
  console.error('Error: Seed script cannot be run in production environment!');
  console.error('This script is for development and testing only.');
  process.exit(1);
}

if (!process.env.CLERK_SECRET_KEY) {
  throw new Error('CLERK_SECRET_KEY environment variable is not set');
}

console.log('🔒 Environment check passed: Running in development mode\n');

/**
 * Main seed function
 */
async function seed() {
  console.log('🌱 Starting database seed...\n');
  console.log('📌 Note: If you encounter duplicate key errors, run `pnpm run db:reset`');
  console.log('   or manually delete test users/orgs from Clerk dashboard.\n');

  try {
    // Dynamic import to avoid module resolution issues with tsx
    const { clerkClient } = await import('@clerk/nextjs/server');
    const clerk = await clerkClient();

    // Step 1: Create or get existing users in Clerk
    console.log('👤 Creating users in Clerk...');

    // Try to get or create Jane
    let janeClerk;
    try {
      janeClerk = await clerk.users.createUser({
        emailAddress: ['jane+clerk_test@example.com'],
        firstName: 'Jane',
        lastName: 'Smith',
        skipPasswordChecks: true,
        skipPasswordRequirement: true,
        publicMetadata: {
          onboardingComplete: true,
        },
      });
      console.log(`  ✅ Created Jane (${janeClerk.id})`);
    } catch (error: unknown) {
      // User might already exist, try to find them
      const userList = await clerk.users.getUserList({
        emailAddress: ['jane+clerk_test@example.com'],
      });
      if (userList.data.length > 0) {
        janeClerk = userList.data[0];
        console.log(`  ⚠️  Jane already exists, using existing user (${janeClerk.id})`);
      } else {
        throw error;
      }
    }

    // Try to get or create John
    let johnClerk;
    try {
      johnClerk = await clerk.users.createUser({
        emailAddress: ['john+clerk_test@example.com'],
        firstName: 'John',
        lastName: 'Doe',
        skipPasswordChecks: true,
        skipPasswordRequirement: true,
        publicMetadata: {
          onboardingComplete: true,
        },
      });
      console.log(`  ✅ Created John (${johnClerk.id})\n`);
    } catch (error: unknown) {
      // User might already exist, try to find them
      const userList = await clerk.users.getUserList({
        emailAddress: ['john+clerk_test@example.com'],
      });
      if (userList.data.length > 0) {
        johnClerk = userList.data[0];
        console.log(`  ⚠️  John already exists, using existing user (${johnClerk.id})\n`);
      } else {
        throw error;
      }
    }

    // Step 2: Sync users to local database
    console.log('💾 Syncing users to database...');

    const janeUser: NewUser = {
      clerkUserId: janeClerk.id,
      email: 'jane+clerk_test@example.com',
      displayName: 'Jane Smith',
      profileImageUrl: janeClerk.imageUrl,
      lastSyncedAt: new Date(),
    };

    const johnUser: NewUser = {
      clerkUserId: johnClerk.id,
      email: 'john+clerk_test@example.com',
      displayName: 'John Doe',
      profileImageUrl: johnClerk.imageUrl,
      lastSyncedAt: new Date(),
    };

    // Insert or update users (in case they already exist from previous seed runs)
    for (const user of [janeUser, johnUser]) {
      await db
        .insert(users)
        .values(user)
        .onConflictDoUpdate({
          target: users.clerkUserId,
          set: {
            email: user.email,
            displayName: user.displayName,
            profileImageUrl: user.profileImageUrl,
            lastSyncedAt: new Date(),
            updatedAt: new Date(),
          },
        });
    }
    console.log('  ✅ Users synced to database\n');

    // Step 3: Create or get existing organizations in Clerk
    console.log('🏢 Creating organizations in Clerk...');

    const org1Name = 'Jane Smith Co.';
    const org2Name = 'John Doe Ltd.';

    const org1Slug = generateSlug(org1Name);
    const org2Slug = generateSlug(org2Name);

    // Try to get or create Jane's organization
    let org1;
    try {
      org1 = await clerk.organizations.createOrganization({
        name: org1Name,
        slug: org1Slug,
        createdBy: janeClerk.id,
        maxAllowedMemberships: 3,
      });
      console.log(`  ✅ Created ${org1Name} (${org1.id})`);
    } catch (error: unknown) {
      // Organization might already exist, try to find it
      const orgList = await clerk.organizations.getOrganizationList({
        limit: 100,
      });
      const existingOrg = orgList.data.find((o) => o.slug === org1Slug);
      if (existingOrg) {
        org1 = existingOrg;
        console.log(`  ⚠️  ${org1Name} already exists, using existing org (${org1.id})`);
      } else {
        throw error;
      }
    }

    // Try to get or create John's organization
    let org2;
    try {
      org2 = await clerk.organizations.createOrganization({
        name: org2Name,
        slug: org2Slug,
        createdBy: johnClerk.id,
        maxAllowedMemberships: 3,
      });
      console.log(`  ✅ Created ${org2Name} (${org2.id})\n`);
    } catch (error: unknown) {
      // Organization might already exist, try to find it
      const orgList = await clerk.organizations.getOrganizationList({
        limit: 100,
      });
      const existingOrg = orgList.data.find((o) => o.slug === org2Slug);
      if (existingOrg) {
        org2 = existingOrg;
        console.log(`  ⚠️  ${org2Name} already exists, using existing org (${org2.id})\n`);
      } else {
        throw error;
      }
    }

    // Step 4: Sync organizations to local database
    console.log('💾 Syncing organizations to database...');

    const org1Data: NewOrganization = {
      clerkOrgId: org1.id,
      name: org1Name,
      slug: org1Slug,
      logoUrl: org1.imageUrl,
      settings: JSON.stringify({
        allowMemberInvites: true,
        requireApproval: false,
      }),
    };

    const org2Data: NewOrganization = {
      clerkOrgId: org2.id,
      name: org2Name,
      slug: org2Slug,
      logoUrl: org2.imageUrl,
      settings: JSON.stringify({
        allowMemberInvites: false,
        requireApproval: true,
      }),
    };

    // Insert or update organizations (in case they already exist from previous seed runs)
    const [insertedOrg1] = await db
      .insert(organizations)
      .values(org1Data)
      .onConflictDoUpdate({
        target: organizations.clerkOrgId,
        set: {
          name: org1Data.name,
          slug: org1Data.slug,
          logoUrl: org1Data.logoUrl,
          settings: org1Data.settings,
          updatedAt: new Date(),
        },
      })
      .returning();

    const [insertedOrg2] = await db
      .insert(organizations)
      .values(org2Data)
      .onConflictDoUpdate({
        target: organizations.clerkOrgId,
        set: {
          name: org2Data.name,
          slug: org2Data.slug,
          logoUrl: org2Data.logoUrl,
          settings: org2Data.settings,
          updatedAt: new Date(),
        },
      })
      .returning();

    console.log('  ✅ Organizations synced to database\n');

    // Step 5: Add John as a member to first organization
    console.log('👥 Adding organization memberships...');

    // Try to add John as a member, or get existing membership
    let johnMembership;
    try {
      johnMembership = await clerk.organizations.createOrganizationMembership({
        organizationId: org1.id,
        userId: johnClerk.id,
        role: 'org:member',
      });
    } catch (error: unknown) {
      // Membership might already exist, get it from the list
      const org1Memberships = await clerk.organizations.getOrganizationMembershipList({
        organizationId: org1.id,
      });
      const existing = org1Memberships.data.find((m) => m.publicUserData?.userId === johnClerk.id);
      if (existing) {
        johnMembership = existing;
      } else {
        throw error;
      }
    }

    const johnMembershipData: NewOrgMembership = {
      organizationId: insertedOrg1.id,
      clerkUserId: johnClerk.id,
      clerkMembershipId: johnMembership.id,
      role: 'org:member',
      invitedBy: janeClerk.id,
    };

    // Jane is already admin of org1 (creator), get her membership
    const org1Memberships = await clerk.organizations.getOrganizationMembershipList({
      organizationId: org1.id,
    });

    const janeMembership = org1Memberships.data.find(
      (m) => m.publicUserData?.userId === janeClerk.id
    );

    if (!janeMembership) {
      throw new Error('Jane membership not found');
    }

    const janeMembershipData: NewOrgMembership = {
      organizationId: insertedOrg1.id,
      clerkUserId: janeClerk.id,
      clerkMembershipId: janeMembership.id,
      role: 'org:admin',
    };

    // John is admin of org2 (creator)
    const org2Memberships = await clerk.organizations.getOrganizationMembershipList({
      organizationId: org2.id,
    });

    const johnOrg2Membership = org2Memberships.data.find(
      (m) => m.publicUserData?.userId === johnClerk.id
    );

    if (!johnOrg2Membership) {
      throw new Error('John org2 membership not found');
    }

    const johnOrg2MembershipData: NewOrgMembership = {
      organizationId: insertedOrg2.id,
      clerkUserId: johnClerk.id,
      clerkMembershipId: johnOrg2Membership.id,
      role: 'org:admin',
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
      clerkUserId: janeClerk.id,
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
      clerkUserId: johnClerk.id,
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

    const taskPriorities: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];

    // Personal tasks for Jane
    const janePersonalTasks: NewTask[] = Array.from({ length: 5 }, (_, i) => ({
      clerkUserId: janeClerk.id,
      title: faker.lorem.sentence({ min: 3, max: 6 }),
      description: faker.lorem.paragraph(),
      completed: i % 3 === 0 ? 'true' : 'false',
      priority: taskPriorities[i % 3],
      dueDate: faker.date.future(),
    }));

    // Organization tasks for org1
    const org1Tasks: NewTask[] = Array.from({ length: 8 }, (_, i) => ({
      clerkUserId: i % 2 === 0 ? janeClerk.id : johnClerk.id,
      organizationId: insertedOrg1.id,
      title: faker.lorem.sentence({ min: 3, max: 6 }),
      description: faker.lorem.paragraph(),
      completed: i % 4 === 0 ? 'true' : 'false',
      priority: taskPriorities[i % 3],
      dueDate: faker.date.future(),
    }));

    // Personal tasks for John
    const johnPersonalTasks: NewTask[] = Array.from({ length: 4 }, (_, i) => ({
      clerkUserId: johnClerk.id,
      title: faker.lorem.sentence({ min: 3, max: 6 }),
      description: faker.lorem.paragraph(),
      completed: i % 2 === 0 ? 'true' : 'false',
      priority: taskPriorities[i % 3],
      dueDate: faker.date.future(),
    }));

    // Organization tasks for org2
    const org2Tasks: NewTask[] = Array.from({ length: 6 }, (_, i) => ({
      clerkUserId: johnClerk.id,
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
    console.log(`  ✅ Created 8 organization tasks for ${org1Name}`);
    console.log('  ✅ Created 4 personal tasks for John');
    console.log(`  ✅ Created 6 organization tasks for ${org2Name}\n`);

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

    const janeActivities: NewActivityLog[] = Array.from({ length: 10 }, (_, i) => ({
      clerkUserId: janeClerk.id,
      action: activityTypes[i % activityTypes.length],
      timestamp: faker.date.recent({ days: 30 }),
      ipAddress: faker.internet.ipv4(),
      metadata: JSON.stringify({
        userAgent: faker.internet.userAgent(),
        location: faker.location.city(),
      }),
    }));

    const johnActivities: NewActivityLog[] = Array.from({ length: 10 }, (_, i) => ({
      clerkUserId: johnClerk.id,
      action: activityTypes[i % activityTypes.length],
      timestamp: faker.date.recent({ days: 30 }),
      ipAddress: faker.internet.ipv4(),
      metadata: JSON.stringify({
        userAgent: faker.internet.userAgent(),
        location: faker.location.city(),
      }),
    }));

    await db.insert(activityLogs).values([...janeActivities, ...johnActivities]);

    console.log('  ✅ Created 10 activity logs for Jane');
    console.log('  ✅ Created 10 activity logs for John\n');

    console.log('✅ Database seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log('  • 2 users created in Clerk and synced');
    console.log('  • 2 organizations created in Clerk and synced');
    console.log('  • 3 organization memberships created');
    console.log('  • 2 subscriptions created (1 Business, 1 Pro)');
    console.log('  • 23 tasks created (9 personal, 14 organization)');
    console.log('  • 20 activity logs created\n');
    console.log('🔑 Test Users:');
    console.log(`  • jane+clerk_test@example.com (Admin of ${org1Name} - Business tier)`);
    console.log(
      `  • john+clerk_test@example.com (Admin of ${org2Name} - Pro tier, Member of ${org1Name})\n`
    );
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run the seed function
seed()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
