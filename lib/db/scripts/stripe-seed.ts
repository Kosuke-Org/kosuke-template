#!/usr/bin/env tsx
/**
 * Stripe Products & Prices Seed Script
 *
 * This script reads products.json and creates/updates products and prices in Stripe.
 * It uses lookup keys for idempotency, so running it multiple times is safe.
 * Usage: bun run stripe:seed
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import { stripe } from '@/lib/billing/client';
import { getProductPrefix, withPrefix } from '@/lib/billing/lookup-keys';

interface ProductConfig {
  lookupKey: string;
  product: {
    name: string;
    description: string;
  };
  price: {
    unit_amount: number;
    currency: string;
    recurring: {
      interval: string;
      interval_count: number;
    };
    tax_behavior: string;
  };
  features: string[];
}

interface ProductsConfig {
  products: ProductConfig[];
  defaults: {
    currency: string;
    interval: string;
    interval_count: number;
    tax_behavior: string;
  };
}

async function seedStripeProducts() {
  console.log('🚀 Starting Stripe products and prices seed...\n');

  try {
    // Get product prefix from KOSUKE_PROJECT_ID environment variable
    const prefix = getProductPrefix();

    if (prefix) {
      console.log(`🏷️  Using product prefix: ${prefix} (from KOSUKE_PROJECT_ID)`);
      console.log('   This allows multiple projects to share the same Stripe test account\n');
    } else {
      console.log('ℹ️  No prefix - using dedicated Stripe account for this deployment\n');
    }

    // Read products configuration
    const configPath = join(process.cwd(), 'lib', 'billing', 'products.json');
    const configFile = readFileSync(configPath, 'utf-8');
    const config: ProductsConfig = JSON.parse(configFile);

    console.log(`📋 Found ${config.products.length} products to sync\n`);

    // Collision detection: warn if unprefixed products exist when no prefix is set
    if (!prefix) {
      const allPrices = await stripe.prices.list({ limit: 100 });
      const existingLookupKeys = allPrices.data
        .map((p) => p.lookup_key)
        .filter((key): key is string => Boolean(key));

      const baseKeys = config.products.map((p) => p.lookupKey);
      const collisions = existingLookupKeys.filter((key) => baseKeys.includes(key));

      if (collisions.length > 0) {
        console.warn('⚠️  WARNING: Found existing products with the same lookup keys:');
        console.warn(`   ${collisions.join(', ')}`);
        console.warn(
          '   If sharing Stripe account across projects, set KOSUKE_PROJECT_ID environment variable'
        );
        console.warn('   to avoid collisions.\n');
      }
    }

    const results: Array<{ productId: string; priceId: string; lookupKey: string }> = [];

    for (const productConfig of config.products) {
      console.log(`\n🔄 Processing ${productConfig.product.name}...`);

      try {
        // Apply prefix to lookup key for Stripe API
        const lookupKey = withPrefix(productConfig.lookupKey);

        // Try to find existing price by lookup key
        const existingPrices = await stripe.prices.list({
          lookup_keys: [lookupKey],
          limit: 1,
        });

        if (existingPrices.data.length > 0) {
          const existingPrice = existingPrices.data[0];
          const currency = existingPrice.currency;
          const currencySymbol = currency?.toLowerCase() === 'eur' ? '€' : '$';
          const amount = existingPrice.unit_amount || 0;
          const interval = existingPrice.recurring?.interval || 'month';

          console.log(`  ✅ Price already exists with lookup key: ${lookupKey}`);
          console.log(`     Price ID: ${existingPrice.id}`);
          console.log(`     Product ID: ${existingPrice.product}`);
          console.log(`     Amount: ${currencySymbol}${(amount / 100).toFixed(2)}/${interval}`);

          results.push({
            productId: existingPrice.product as string,
            priceId: existingPrice.id,
            lookupKey: lookupKey,
          });

          continue;
        }

        // Create new product and price
        console.log(`  📦 Creating new product: ${productConfig.product.name}`);

        // First create the product with marketing_features
        const product = await stripe.products.create({
          name: productConfig.product.name,
          description: productConfig.product.description,
          marketing_features: productConfig.features.map((feature) => ({ name: feature })),
        });

        console.log(`     Product ID: ${product.id}`);

        // Then create the price for that product (with prefixed lookup key)
        const price = await stripe.prices.create({
          lookup_key: lookupKey,
          product: product.id,
          unit_amount: productConfig.price.unit_amount,
          currency: productConfig.price.currency || config.defaults.currency,
          recurring: {
            interval: productConfig.price.recurring.interval as 'month' | 'year',
            interval_count:
              productConfig.price.recurring.interval_count || config.defaults.interval_count,
          },
          tax_behavior: (productConfig.price.tax_behavior ||
            config.defaults.tax_behavior) as 'unspecified',
        });

        const currency = productConfig.price.currency || config.defaults.currency;
        const currencySymbol = currency.toLowerCase() === 'eur' ? '€' : '$';
        const interval = productConfig.price.recurring.interval;

        console.log(`  ✅ Successfully created product and price`);
        console.log(`     Price ID: ${price.id}`);
        console.log(`     Lookup Key: ${lookupKey}`);
        console.log(`     Base Key: ${productConfig.lookupKey}`);
        console.log(
          `     Amount: ${currencySymbol}${(productConfig.price.unit_amount / 100).toFixed(2)}/${interval}`
        );

        results.push({
          productId: price.product as string,
          priceId: price.id,
          lookupKey: lookupKey,
        });
      } catch (error) {
        console.error(`  ❌ Error processing ${productConfig.product.name}:`, error);
        throw error;
      }
    }

    // Print summary
    console.log('\n\n✅ Stripe products and prices sync completed successfully!\n');
    console.log('📊 Summary:\n');
    console.table(
      results.map((result) => ({
        'Product ID': result.productId,
        'Price ID': result.priceId,
        'Lookup Key': result.lookupKey,
      }))
    );

    console.log('\n💡 Note: These lookup keys can now be used to fetch prices dynamically.');
    console.log('   No need to manually copy price IDs to environment variables!\n');
  } catch (error) {
    console.error('\n❌ Error seeding Stripe products:', error);
    throw error;
  }
}

async function seedStripe() {
  console.log('🎯 Starting Stripe seed process...\n');
  console.log('='.repeat(70));

  try {
    await seedStripeProducts();

    console.log('\n' + '='.repeat(70));
    console.log('🎉 Stripe seed completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Fatal error during Stripe seed:', error);
    throw error;
  }
}

seedStripe()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
