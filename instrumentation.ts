import * as Sentry from '@sentry/nextjs';

/**
 * Validates required environment variables at runtime startup
 * This runs after build but before the application serves requests
 */
function validateEnvironmentVariables() {
  const requiredEnvVars = [
    // Database
    { key: 'POSTGRES_URL', description: 'PostgreSQL database connection URL' },
    { key: 'POSTGRES_PASSWORD', description: 'PostgreSQL database password' },
    // Redis
    { key: 'REDIS_URL', description: 'Redis connection URL' },

    // Better Auth
    { key: 'BETTER_AUTH_SECRET', description: 'Better Auth secret key' },

    // Next.js
    { key: 'NEXT_PUBLIC_APP_URL', description: 'Application URL' },

    // Stripe
    { key: 'STRIPE_PUBLISHABLE_KEY', description: 'Stripe publishable key' },
    { key: 'STRIPE_SECRET_KEY', description: 'Stripe secret key' },
    { key: 'STRIPE_PRO_PRICE_ID', description: 'Stripe Pro plan price ID' },
    { key: 'STRIPE_BUSINESS_PRICE_ID', description: 'Stripe Business plan price ID' },
    { key: 'STRIPE_WEBHOOK_SECRET', description: 'Stripe webhook secret' },

    // Resend
    { key: 'RESEND_API_KEY', description: 'Resend API key for emails' },
    { key: 'RESEND_FROM_EMAIL', description: 'Resend from email address' },

    // Engine
    { key: 'ENGINE_BASE_URL', description: 'Python microservice base URL' },

    // S3 Storage
    { key: 'S3_REGION', description: 'S3-compatible storage region' },
    { key: 'S3_ENDPOINT', description: 'S3-compatible storage endpoint' },
    { key: 'S3_BUCKET', description: 'S3-compatible storage bucket name' },
    { key: 'S3_ACCESS_KEY_ID', description: 'S3-compatible storage access key' },
    { key: 'S3_SECRET_ACCESS_KEY', description: 'S3-compatible storage secret key' },
  ];

  const missingVars = requiredEnvVars.filter(({ key }) => !process.env[key]);

  if (missingVars.length > 0) {
    const errorMessage = [
      '❌ Missing required environment variables:',
      ...missingVars.map(({ key, description }) => `  - ${key}: ${description}`),
      '\nPlease add these to your .env file before starting the application.',
    ].join('\n');

    throw new Error(errorMessage);
  }

  console.log('✅ All required environment variables are present');
}

export async function register() {
  console.log('📊 Instrumentation register() called');

  // Validate environment variables on server startup
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    validateEnvironmentVariables();
  }

  // Initialize Sentry in production
  if (process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.NODE_ENV === 'production') {
    console.log('📊 Initializing Sentry...');
    try {
      if (process.env.NEXT_RUNTIME === 'nodejs') {
        await import('./sentry.server.config');
      } else if (process.env.NEXT_RUNTIME === 'edge') {
        await import('./sentry.edge.config');
      }
      console.log('✅ Sentry ready');
    } catch (error) {
      console.error('❌ Sentry init failed:', error);
    }
  }
}

export const onRequestError = Sentry.captureRequestError;
