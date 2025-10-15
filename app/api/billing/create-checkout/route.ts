import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { ensureUserSynced } from '@/lib/auth';
import {
  getUserSubscription,
  getSubscriptionEligibility,
  createCheckoutSession,
} from '@/lib/billing';
import { ApiErrorHandler } from '@/lib/api/errors';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized();
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Ensure user is synced to local database
    await ensureUserSynced(user);

    const { tier } = await request.json();

    if (!tier || !['pro', 'business'].includes(tier)) {
      return ApiErrorHandler.badRequest('Invalid tier specified');
    }

    // Check user's current subscription status
    const currentSubscription = await getUserSubscription(user.id);

    // Check if user can create a new subscription or upgrade existing one
    const eligibility = getSubscriptionEligibility(currentSubscription);

    // Allow if user can create new subscription OR upgrade existing one
    if (!eligibility.canCreateNew && !eligibility.canUpgrade) {
      return NextResponse.json(
        {
          success: false,
          error: eligibility.reason || 'Cannot create new subscription or upgrade at this time.',
          action: 'customer_portal_required',
          message:
            'Please manage your existing subscription first. You can access the Stripe Customer Portal from your billing settings.',
        },
        { status: 409 }
      );
    }

    const customerEmail = user.emailAddresses[0]?.emailAddress;
    if (!customerEmail) {
      return NextResponse.json({ error: 'No email found for user' }, { status: 400 });
    }

    // Create Stripe Checkout session
    const result = await createCheckoutSession({
      tier,
      userId: user.id,
      customerEmail,
      metadata: {
        tier,
        // Add context about previous subscription if it exists
        ...(currentSubscription.activeSubscription?.stripeSubscriptionId && {
          previousSubscriptionId: currentSubscription.activeSubscription.stripeSubscriptionId,
        }),
        previousTier: currentSubscription.activeSubscription?.tier || 'free',
      },
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      checkoutUrl: result.data?.url,
      sessionId: result.data?.id,
    });
  } catch (error) {
    console.error('💥 Error creating checkout session:', error);

    // Handle specific Stripe API errors
    if (error instanceof Error) {
      if (error.message.includes('active subscription') || error.message.includes('already has')) {
        return NextResponse.json(
          {
            success: false,
            error: 'You have an existing subscription that needs to be managed first.',
            action: 'customer_portal_required',
            message:
              'Please access the Stripe Customer Portal from your billing settings to manage your subscription.',
          },
          { status: 409 }
        );
      }

      if (error.message.includes('price') && error.message.includes('not found')) {
        return ApiErrorHandler.badRequest('Invalid subscription tier selected');
      }
    }

    return ApiErrorHandler.internalServerError('Failed to create checkout session');
  }
}
