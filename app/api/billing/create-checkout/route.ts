import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import { Polar } from '@polar-sh/sdk';

// Initialize Polar API
const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
});

export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tier } = await request.json();

    if (!tier || !['pro', 'business'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    // Get the product ID based on tier
    const productId =
      tier === 'pro' ? process.env.POLAR_PRO_PRODUCT_ID! : process.env.POLAR_BUSINESS_PRODUCT_ID!;

    // Create checkout session
    const checkout = await polar.checkouts.create({
      products: [productId],
      successUrl: process.env.POLAR_SUCCESS_URL!,
      customerEmail: user.primaryEmail,
      metadata: {
        userId: user.id,
        tier,
      },
    });

    return NextResponse.json({
      checkoutUrl: checkout.url,
      checkoutId: checkout.id,
    });
  } catch (error) {
    console.error('Error creating checkout:', error);
    return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 });
  }
}
