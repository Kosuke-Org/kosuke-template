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
  parseOrgSettings,
  stringifyOrgSettings,
  isValidOrgName,
  isValidOrgSlug,
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
