import { execSync } from 'child_process';

if (process.env.VERCEL_ENV === 'preview') {
  console.log('Running db:reset for preview deployment...');
  execSync('pnpm run db:reset', { stdio: 'inherit' });
} else {
  console.log('Skipping db:reset (not a preview deployment)');
}
