import packageJson from '../package.json';

/**
 * Get the application version from package.json
 */
export function getAppVersion(): string | null {
  return packageJson.version ?? null;
}
