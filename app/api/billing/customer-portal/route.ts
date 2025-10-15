import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createCustomerPortalSession } from '@/lib/billing';

/**
 * Create Stripe Customer Portal session
 * Allows users to manage their subscription, payment methods, and billing history
 */
export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await createCustomerPortalSession(userId);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      url: result.data?.url,
    });
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 });
  }
}
