import { deploy } from './src/deploy';

deploy().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
