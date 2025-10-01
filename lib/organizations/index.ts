/**
 * Organizations Module
 * Main exports for organization-related functionality
 */

// Utility functions
export {
  generateOrgSlug,
  generateUniqueOrgSlug,
  isOrgAdmin,
  isOrgMember,
  canManageOrg,
  canInviteMembers,
  canManageTeams,
  canManageBilling,
  isUserOrgMember,
  getUserOrgRole,
  getUserOrgMembership,
  isUserOrgAdmin,
  getOrgByClerkId,
  getOrgById,
  getOrgBySlug,
  getUserOrganizations,
  getUserMemberships,
  getOrgMembers,
  getMembershipByClerkId,
  getOrgTeams,
  getTeamById,
  isUserTeamMember,
  getUserTeams,
  getTeamMembers,
  parseOrgSettings,
  stringifyOrgSettings,
  isValidOrgName,
  isValidOrgSlug,
  isValidTeamName,
  isValidHexColor,
} from './utils';

// Sync functions
export {
  syncOrganizationFromClerk,
  syncOrgFromWebhook,
  syncMembershipFromClerk,
  syncMembershipFromWebhook,
  syncAllUserOrganizations,
  removeOrgMembership,
  softDeleteOrganization,
} from './sync';

// Types
export type { ClerkOrgWebhook, ClerkMembershipWebhook } from './sync';
