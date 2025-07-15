import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { getUserByClerkId } from '@/lib/user-sync';
import { db } from '@/lib/db';
import { users, activityLogs, ActivityType } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';

// Define types for webhook events
interface ClerkWebhookEvent {
  type: string;
  data: ClerkWebhookUser;
}

interface ClerkWebhookUser {
  id: string;
  email_addresses?: Array<{ email_address: string }>;
  first_name?: string;
  last_name?: string;
  image_url?: string;
  [key: string]: unknown;
}

export async function POST(req: NextRequest) {
  console.log('🔔 Clerk webhook received');

  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('❌ CLERK_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // Check if we have all required headers
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error('❌ Missing required Svix headers');
    return NextResponse.json({ error: 'Missing required headers' }, { status: 400 });
  }

  // Get the body
  let payload: ClerkWebhookEvent;
  let body: string;

  try {
    payload = await req.json();
    body = JSON.stringify(payload);
  } catch (error) {
    console.error('❌ Error parsing webhook body:', error);
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  // Create a new Svix instance with your secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: ClerkWebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    console.error('❌ Error verifying webhook signature:', err);
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  // Handle the webhook
  const eventType = evt.type;
  const userData = evt.data;

  console.log(`📨 Processing ${eventType} for user: ${userData.id}`);

  try {
    switch (eventType) {
      case 'user.created':
        await handleUserCreated(userData);
        break;

      case 'user.updated':
        await handleUserUpdated(userData);
        break;

      case 'user.deleted':
        await handleUserDeleted(userData);
        break;

      default:
        console.log(`ℹ️ Unhandled event type: ${eventType}`);
        break;
    }

    console.log(`✅ Successfully processed ${eventType} for user: ${userData.id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`❌ Error processing ${eventType}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Sync user from webhook data (different structure than API User object)
 */
async function syncUserFromWebhook(
  webhookUser: ClerkWebhookUser
): Promise<{ id: number; clerkUserId: string }> {
  try {
    console.log('🔄 Syncing user from webhook:', webhookUser.id);

    // Check if user already exists in our database
    const existingUser = await getUserByClerkId(webhookUser.id);

    const userData = {
      clerkUserId: webhookUser.id,
      email: webhookUser.email_addresses?.[0]?.email_address || '',
      displayName:
        webhookUser.first_name && webhookUser.last_name
          ? `${webhookUser.first_name} ${webhookUser.last_name}`.trim()
          : webhookUser.first_name || null,
      profileImageUrl: webhookUser.image_url || null,
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    };

    let user: { id: number; clerkUserId: string };

    if (existingUser) {
      console.log('👤 User exists, checking for updates...');

      // Check if any data has changed
      const hasChanges =
        existingUser.email !== userData.email ||
        existingUser.displayName !== userData.displayName ||
        existingUser.profileImageUrl !== userData.profileImageUrl;

      if (hasChanges) {
        console.log('📝 User data changed, updating...');

        // Update existing user
        await db.update(users).set(userData).where(eq(users.clerkUserId, webhookUser.id));

        user = { id: existingUser.id, clerkUserId: webhookUser.id };

        // Log the update activity
        await db.insert(activityLogs).values({
          clerkUserId: webhookUser.id,
          action: ActivityType.UPDATE_ACCOUNT,
          timestamp: new Date(),
        });
      } else {
        console.log('✅ User data unchanged, updating sync timestamp only');

        // Just update the sync timestamp
        await db
          .update(users)
          .set({ lastSyncedAt: new Date() })
          .where(eq(users.clerkUserId, webhookUser.id));

        user = { id: existingUser.id, clerkUserId: webhookUser.id };
      }
    } else {
      console.log('🆕 Creating new user in database...');

      // Create new user
      const [newUser] = await db
        .insert(users)
        .values({
          ...userData,
          createdAt: new Date(),
        })
        .returning({ id: users.id, clerkUserId: users.clerkUserId });

      user = newUser;

      // Log the signup activity
      await db.insert(activityLogs).values({
        clerkUserId: webhookUser.id,
        action: ActivityType.SIGN_UP,
        timestamp: new Date(),
      });

      console.log('✅ New user created with ID:', newUser.id);
    }

    return user;
  } catch (error) {
    console.error('💥 Error syncing user from webhook:', error);
    throw error;
  }
}

/**
 * Handle user.created webhook event
 */
async function handleUserCreated(userData: ClerkWebhookUser) {
  console.log('🆕 Creating new user from webhook');

  try {
    // Check if user already exists (prevent duplicates)
    const existingUser = await getUserByClerkId(userData.id);

    if (existingUser) {
      console.log('👤 User already exists, updating instead');
      await syncUserFromWebhook(userData);
      return;
    }

    // Create new user
    await syncUserFromWebhook(userData);

    console.log(`✅ New user created: ${userData.id}`);
  } catch (error) {
    console.error('💥 Error in handleUserCreated:', error);
    throw error;
  }
}

/**
 * Handle user.updated webhook event
 */
async function handleUserUpdated(userData: ClerkWebhookUser) {
  console.log('📝 Updating existing user from webhook');

  try {
    // Update user data
    await syncUserFromWebhook(userData);

    console.log(`✅ User updated: ${userData.id}`);
  } catch (error) {
    console.error('💥 Error in handleUserUpdated:', error);
    throw error;
  }
}

/**
 * Handle user.deleted webhook event
 */
async function handleUserDeleted(userData: ClerkWebhookUser) {
  console.log('🗑️ Processing user deletion from webhook');

  try {
    const clerkUserId = userData.id;

    // Find the user in our database
    const localUser = await getUserByClerkId(clerkUserId);

    if (!localUser) {
      console.log(`ℹ️ User ${clerkUserId} not found in local database`);
      return;
    }

    // Option 1: Soft delete (recommended)
    // Mark user as deleted but keep the record for data integrity
    await db
      .update(users)
      .set({
        email: `deleted_${clerkUserId}@example.com`, // Anonymize email
        displayName: 'Deleted User',
        profileImageUrl: null,
        updatedAt: new Date(),
      })
      .where(eq(users.clerkUserId, clerkUserId));

    // Log the deletion activity
    await db.insert(activityLogs).values({
      clerkUserId,
      action: ActivityType.DELETE_ACCOUNT,
      timestamp: new Date(),
      metadata: JSON.stringify({
        deletedAt: new Date().toISOString(),
        originalEmail: userData.email_addresses?.[0]?.email_address,
      }),
    });

    console.log(`✅ User soft-deleted: ${clerkUserId}`);

    // Option 2: Hard delete (uncomment if you prefer complete removal)
    // Note: This will break foreign key relationships if user has related data
    /*
    await db.delete(users).where(eq(users.clerkUserId, clerkUserId));
    console.log(`✅ User hard-deleted: ${clerkUserId}`);
    */
  } catch (error) {
    console.error('💥 Error in handleUserDeleted:', error);
    throw error;
  }
}
