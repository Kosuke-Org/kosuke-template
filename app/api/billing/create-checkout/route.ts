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
  console.log('🚀 CHECKOUT CREATION - Starting...');

  try {
    const user = await stackServerApp.getUser();
    console.log('👤 User details:');
    console.log('- User ID:', user?.id);
    console.log('- User email:', user?.primaryEmail);
    console.log('- User ID type:', typeof user?.id);

    if (!user) {
      console.error('❌ No user found - unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure user is synced to local database
    console.log('🔄 Ensuring user is synced to local database...');
    const localUser = await ensureUserSynced(user);
    console.log(
      '✅ User synced - Local ID:',
      localUser.id,
      'StackAuth ID:',
      localUser.stackAuthUserId
    );

    const { tier } = await request.json();
    console.log('🎯 Requested tier:', tier);

    if (!tier || !['pro', 'business'].includes(tier)) {
      console.error('❌ Invalid tier requested:', tier);
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    // Get the product ID based on tier
    const productId =
      tier === 'pro' ? process.env.POLAR_PRO_PRODUCT_ID! : process.env.POLAR_BUSINESS_PRODUCT_ID!;

    console.log('🏷️ Environment details:');
    console.log('- POLAR_ENVIRONMENT:', process.env.POLAR_ENVIRONMENT);
    console.log('- Product ID for', tier + ':', productId);
    console.log('- Success URL:', process.env.POLAR_SUCCESS_URL);

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

    console.log('📋 Checkout data being sent to Polar:');
    console.log(JSON.stringify(checkoutData, null, 2));

    // Create checkout session
    console.log('🔄 Creating checkout session with Polar...');
    const checkout = await polar.checkouts.create(checkoutData);

    console.log('✅ Checkout created successfully:');
    console.log('- Checkout ID:', checkout.id);
    console.log('- Checkout URL:', checkout.url);
    console.log('- Full checkout response:', JSON.stringify(checkout, null, 2));

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
