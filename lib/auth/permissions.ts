import 'server-only';

/**
 * Super Admin Permissions
 * This module handles super admin access control for the application
 *
 * Configuration:
 * Set SUPER_ADMIN_EMAILS environment variable with comma-separated email addresses
 * Example: SUPER_ADMIN_EMAILS=admin@kosuke.ai,admin2@kosuke.ai
 */

/**
 * Get list of super admin emails from environment
 */
function getSuperAdminEmails(): Set<string> {
  const emails = process.env.SUPER_ADMIN_EMAILS || '';
  return new Set(
    emails
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

/**
 * Check if a user is a super admin by user email
 * @param userEmail - Better Auth user email
 * @returns Promise<boolean>
 */
export function isSuperAdminByUserEmail(userEmail: string | undefined): boolean {
  if (!userEmail) return false;
  const superAdminEmails = getSuperAdminEmails();
  return superAdminEmails.has(userEmail);
}
