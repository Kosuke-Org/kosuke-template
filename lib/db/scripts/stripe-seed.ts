#!/usr/bin/env tsx
/**
 * Stripe Products & Prices Seed Script
 *
 * This script reads products.json and creates/updates products and prices in Stripe.
 * It uses lookup keys for idempotency, so running it multiple times is safe.
 *
 * Usage: bun run stripe:seed
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import { stripe } from '@/lib/billing/client';

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
    // Read products configuration
    const configPath = join(process.cwd(), 'lib', 'billing', 'products.json');
    const configFile = readFileSync(configPath, 'utf-8');
    const config: ProductsConfig = JSON.parse(configFile);

    console.log(`📋 Found ${config.products.length} products to sync\n`);

    const results: Array<{ productId: string; priceId: string; lookupKey: string }> = [];

    for (const productConfig of config.products) {
      console.log(`\n🔄 Processing ${productConfig.product.name}...`);

      try {
        // Try to find existing price by lookup key
        const existingPrices = await stripe.prices.list({
          lookup_keys: [productConfig.lookupKey],
          limit: 1,
        });

        if (existingPrices.data.length > 0) {
          const existingPrice = existingPrices.data[0];
          console.log(`  ✅ Price already exists with lookup key: ${productConfig.lookupKey}`);
          console.log(`     Price ID: ${existingPrice.id}`);
          console.log(`     Product ID: ${existingPrice.product}`);

          results.push({
            productId: existingPrice.product as string,
            priceId: existingPrice.id,
            lookupKey: productConfig.lookupKey,
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

        // Then create the price for that product
        const price = await stripe.prices.create({
          lookup_key: productConfig.lookupKey,
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

        console.log(`  ✅ Successfully created product and price`);
        console.log(`     Price ID: ${price.id}`);
        console.log(`     Lookup Key: ${productConfig.lookupKey}`);
        console.log(`     Amount: $${(productConfig.price.unit_amount / 100).toFixed(2)}/month`);

        results.push({
          productId: price.product as string,
          priceId: price.id,
          lookupKey: productConfig.lookupKey,
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

seedStripeProducts()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
