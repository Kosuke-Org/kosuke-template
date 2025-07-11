import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import { Polar } from '@polar-sh/sdk';
import { ensureUserSynced } from '@/lib/user-sync';

// Initialize Polar API
const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: process.env.POLAR_ENVIRONMENT === 'sandbox' ? 'sandbox' : 'production',
});

export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure user is synced to local database
    const localUser = await ensureUserSynced(user);

    const { tier } = await request.json();

    if (!tier || !['pro', 'business'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    // Get the product ID based on tier
    const productId =
      tier === 'pro' ? process.env.POLAR_PRO_PRODUCT_ID! : process.env.POLAR_BUSINESS_PRODUCT_ID!;

    // Prepare checkout data
    const checkoutData = {
      products: [productId],
      successUrl: process.env.POLAR_SUCCESS_URL!,
      customerEmail: user.primaryEmail,
      metadata: {
        userId: user.id, // StackAuth UUID
        localUserId: localUser.id.toString(), // Local database ID
        tier,
      },
    };

    // Create checkout session
    const checkout = await polar.checkouts.create(checkoutData);

    return NextResponse.json({
      checkoutUrl: checkout.url,
      checkoutId: checkout.id,
    });
  } catch (error) {
    console.error('💥 ERROR creating checkout:');
    console.error('- Error type:', error?.constructor?.name);
    console.error('- Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('- Error stack:', error instanceof Error ? error.stack : 'No stack trace');

    return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 });
  }
}
