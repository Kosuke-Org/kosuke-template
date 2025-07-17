import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { Polar } from '@polar-sh/sdk';
import { ensureUserSynced } from '@/lib/user-sync';
import { getUserSubscription, getSubscriptionEligibility } from '@/lib/billing/utils';
import { ApiErrorHandler } from '@/lib/api/errors';

// Initialize Polar API
const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: process.env.POLAR_ENVIRONMENT === 'sandbox' ? 'sandbox' : 'production',
});

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
    const eligibility = getSubscriptionEligibility(currentSubscription);

    // Verify user can upgrade
    if (!eligibility.canUpgrade) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot upgrade subscription at this time.',
          reason: eligibility.reason,
        },
        { status: 409 }
      );
    }

    // Ensure user has an active subscription to upgrade from
    if (!currentSubscription.activeSubscription?.subscriptionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'No active subscription found to upgrade.',
        },
        { status: 400 }
      );
    }

    console.log(
      `🔄 Starting upgrade from ${currentSubscription.tier} to ${tier} for user ${user.id}`
    );

    // Step 1: Cancel the existing subscription immediately
    try {
      await polar.subscriptions.revoke({
        id: currentSubscription.activeSubscription.subscriptionId,
      });
      console.log('✅ Existing subscription canceled');
    } catch (cancelError) {
      console.error('💥 Failed to cancel existing subscription:', cancelError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to cancel existing subscription. Please try again.',
        },
        { status: 500 }
      );
    }

    // Step 2: Create checkout for new subscription
    const productId =
      tier === 'pro' ? process.env.POLAR_PRO_PRODUCT_ID! : process.env.POLAR_BUSINESS_PRODUCT_ID!;

    try {
      const checkoutData = {
        products: [productId],
        successUrl: process.env.POLAR_SUCCESS_URL!,
        customerEmail: user.emailAddresses[0]?.emailAddress,
        metadata: {
          userId: user.id,
          localUserId: localUser.id.toString(),
          tier,
          upgradeFrom: currentSubscription.tier,
          previousSubscriptionId: currentSubscription.activeSubscription.subscriptionId,
          isUpgrade: 'true',
        },
      };

      const checkout = await polar.checkouts.create(checkoutData);

      console.log('✅ Upgrade checkout created successfully');

      return NextResponse.json({
        success: true,
        checkoutUrl: checkout.url,
        message: `Upgrade from ${currentSubscription.tier} to ${tier} initiated`,
        upgradeDetails: {
          from: currentSubscription.tier,
          to: tier,
          checkoutId: checkout.id,
        },
      });
    } catch (checkoutError) {
      console.error('💥 Failed to create upgrade checkout:', checkoutError);

      // If checkout creation fails after canceling, we need to handle this gracefully
      // The user's subscription is now canceled, so we should inform them
      return NextResponse.json(
        {
          success: false,
          error:
            'Your subscription has been canceled, but the upgrade checkout failed. Please try subscribing again or contact support.',
          requiresNewSubscription: true,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('💥 Error in upgrade endpoint:', error);
    return ApiErrorHandler.internalServerError('Failed to process subscription upgrade');
  }
}
