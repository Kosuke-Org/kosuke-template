import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { getUserByClerkId, ActivityType, isValidEmail, syncUserFromWebhook } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, activityLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { sendEmail } from '@/lib/email';
import { WelcomeEmail } from '@/lib/email/templates';
import React from 'react';
import {
  syncOrgFromWebhook,
  syncMembershipFromWebhook,
  removeOrgMembership,
  softDeleteOrganization,
} from '@/lib/organizations';
import type {
  AnyClerkWebhookEvent,
  ClerkOrganizationWebhook,
  ClerkMembershipWebhook,
  ClerkWebhookUser,
} from '@/lib/types';

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
  let payload: AnyClerkWebhookEvent;
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

  let evt: AnyClerkWebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as AnyClerkWebhookEvent;
  } catch (err) {
    console.error('❌ Error verifying webhook signature:', err);
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  // Handle the webhook
  const eventType = evt.type;
  const eventData = evt.data;

  console.log(`📨 Processing ${eventType}`);

  try {
    switch (eventType) {
      // User events
      case 'user.created':
        await handleUserCreated(eventData as ClerkWebhookUser);
        break;

      case 'user.updated':
        await handleUserUpdated(eventData as ClerkWebhookUser);
        break;

      case 'user.deleted':
        await handleUserDeleted(eventData as ClerkWebhookUser);
        break;

      // Organization events
      case 'organization.created':
        await handleOrganizationCreated(eventData as ClerkOrganizationWebhook);
        break;

      case 'organization.updated':
        await handleOrganizationUpdated(eventData as ClerkOrganizationWebhook);
        break;

      case 'organization.deleted':
        await handleOrganizationDeleted(eventData as ClerkOrganizationWebhook);
        break;

      // Membership events
      case 'organizationMembership.created':
        await handleMembershipCreated(eventData as ClerkMembershipWebhook);
        break;

      case 'organizationMembership.updated':
        await handleMembershipUpdated(eventData as ClerkMembershipWebhook);
        break;

      case 'organizationMembership.deleted':
        await handleMembershipDeleted(eventData as ClerkMembershipWebhook);
        break;

      // Invitation events (logged only)
      case 'organizationInvitation.created':
        console.log('📧 Organization invitation created');
        break;

      case 'organizationInvitation.accepted':
        console.log('✅ Organization invitation accepted');
        // Membership will be created via organizationMembership.created event
        break;

      case 'organizationInvitation.revoked':
        console.log('🚫 Organization invitation revoked');
        break;

      default:
        console.log(`ℹ️ Unhandled event type: ${eventType}`);
        break;
    }

    console.log(`✅ Successfully processed ${eventType}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`❌ Error processing ${eventType}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
      await syncUserFromWebhook(userData, { includeActivity: true });
      return;
    }

    // Create new user (with activity logging enabled)
    await syncUserFromWebhook(userData, { includeActivity: true });

    console.log(`✅ New user created: ${userData.id}`);

    // Send welcome email (don't let email failures break user creation)
    await sendWelcomeEmail(userData);
  } catch (error) {
    console.error('💥 Error in handleUserCreated:', error);
    throw error;
  }
}

/**
 * Send welcome email to newly created user
 */
async function sendWelcomeEmail(userData: ClerkWebhookUser) {
  try {
    const email = userData.email_addresses?.[0]?.email_address;
    const firstName = userData.first_name || 'there';

    if (!email || !isValidEmail(email)) {
      console.log('⚠️ No valid email address found for user, skipping welcome email');
      return;
    }

    console.log('📧 Sending welcome email to:', email);

    // Send the email using React Email
    await sendEmail({
      to: email,
      subject: `Welcome to Kosuke Template, ${firstName}! 🎉`,
      react: React.createElement(WelcomeEmail, {
        firstName,
        email,
        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`,
        settingsUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings`,
      }),
    });

    console.log('✅ Welcome email sent successfully to:', email);
  } catch (error) {
    // Log the error but don't throw it - we don't want email failures to break user creation
    console.error('💥 Error sending welcome email:', error);
    console.log('ℹ️ User creation will continue despite email failure');
  }
}

/**
 * Handle user.updated webhook event
 */
async function handleUserUpdated(userData: ClerkWebhookUser) {
  console.log('📝 Updating existing user from webhook');

  try {
    // Update user data (with activity logging enabled)
    await syncUserFromWebhook(userData, { includeActivity: true });

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

/**
 * ORGANIZATION EVENT HANDLERS
 */

/**
 * Handle organization.created webhook event
 */
async function handleOrganizationCreated(orgData: ClerkOrganizationWebhook) {
  console.log('🏢 Creating organization from webhook:', orgData.id);

  try {
    await syncOrgFromWebhook(orgData);
    console.log(`✅ Organization created: ${orgData.id}`);
  } catch (error) {
    console.error('💥 Error in handleOrganizationCreated:', error);
    throw error;
  }
}

/**
 * Handle organization.updated webhook event
 */
async function handleOrganizationUpdated(orgData: ClerkOrganizationWebhook) {
  console.log('📝 Updating organization from webhook:', orgData.id);

  try {
    await syncOrgFromWebhook(orgData);
    console.log(`✅ Organization updated: ${orgData.id}`);
  } catch (error) {
    console.error('💥 Error in handleOrganizationUpdated:', error);
    throw error;
  }
}

/**
 * Handle organization.deleted webhook event
 */
async function handleOrganizationDeleted(orgData: ClerkOrganizationWebhook) {
  console.log('🗑️ Processing organization deletion from webhook:', orgData.id);

  try {
    await softDeleteOrganization(orgData.id);
    console.log(`✅ Organization deleted: ${orgData.id}`);
  } catch (error) {
    console.error('💥 Error in handleOrganizationDeleted:', error);
    throw error;
  }
}

/**
 * MEMBERSHIP EVENT HANDLERS
 */

/**
 * Handle organizationMembership.created webhook event
 */
async function handleMembershipCreated(membershipData: ClerkMembershipWebhook) {
  console.log('👤 Adding member to organization:', membershipData.id);

  try {
    await syncMembershipFromWebhook(membershipData);
    console.log(`✅ Membership created: ${membershipData.id}`);
  } catch (error) {
    console.error('💥 Error in handleMembershipCreated:', error);
    throw error;
  }
}

/**
 * Handle organizationMembership.updated webhook event
 */
async function handleMembershipUpdated(membershipData: ClerkMembershipWebhook) {
  console.log('📝 Updating organization membership:', membershipData.id);

  try {
    await syncMembershipFromWebhook(membershipData);
    console.log(`✅ Membership updated: ${membershipData.id}`);
  } catch (error) {
    console.error('💥 Error in handleMembershipUpdated:', error);
    throw error;
  }
}

/**
 * Handle organizationMembership.deleted webhook event
 */
async function handleMembershipDeleted(membershipData: ClerkMembershipWebhook) {
  console.log('🗑️ Removing member from organization:', membershipData.id);

  try {
    await removeOrgMembership(membershipData.id);
    console.log(`✅ Membership deleted: ${membershipData.id}`);
  } catch (error) {
    console.error('💥 Error in handleMembershipDeleted:', error);
    throw error;
  }
}
