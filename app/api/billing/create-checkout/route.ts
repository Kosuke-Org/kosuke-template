import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { ensureUserSynced } from '@/lib/auth';
import { getUserSubscription, getSubscriptionEligibility, polar } from '@/lib/billing';
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
    const localUser = await ensureUserSynced(user);

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
            'Please manage your existing subscription first. Contact support or check your Polar emails for subscription management links.',
        },
        { status: 409 }
      );
    }

    // Get the appropriate product ID
    const productId =
      tier === 'pro' ? process.env.POLAR_PRO_PRODUCT_ID! : process.env.POLAR_BUSINESS_PRODUCT_ID!;

    // Prepare checkout data
    const checkoutData = {
      products: [productId],
      successUrl: process.env.POLAR_SUCCESS_URL!,
      customerEmail: user.emailAddresses[0]?.emailAddress,
      metadata: {
        userId: user.id, // Clerk user ID
        localUserId: localUser.id.toString(), // Local database ID
        tier,
        // Add context about previous subscription if it exists
        ...(currentSubscription.activeSubscription?.subscriptionId && {
          previousSubscriptionId: currentSubscription.activeSubscription.subscriptionId,
        }),
        previousTier: currentSubscription.activeSubscription?.tier || 'free',
      },
    };

    // Create checkout session with Polar (following best practices)
    const checkoutSession = await polar.checkouts.create(checkoutData);

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutSession.url,
      checkoutId: checkoutSession.id,
    });
  } catch (error) {
    console.error('💥 Error creating checkout session:', error);

    // Handle specific Polar API errors
    if (error instanceof Error) {
      if (error.message.includes('active subscription') || error.message.includes('already has')) {
        // Best practice: Don't auto-sync, direct to customer portal
        return NextResponse.json(
          {
            success: false,
            error: 'You have an existing subscription that needs to be managed first.',
            action: 'customer_portal_required',
            message:
              'Please contact support or check your Polar emails for subscription management links.',
          },
          { status: 409 }
        );
      }

      if (error.message.includes('product') && error.message.includes('not found')) {
        return ApiErrorHandler.badRequest('Invalid subscription tier selected');
      }
    }

    return ApiErrorHandler.internalServerError('Failed to create checkout session');
  }
}
