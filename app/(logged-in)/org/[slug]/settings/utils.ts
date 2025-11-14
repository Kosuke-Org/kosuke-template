// Get allowed actions for current user's role on other members
// owner: Full control - can perform any action
// admin: Full control except deleting org or changing owner - can manage members but not transfer ownership
// member: Limited control - can create projects, invite users, manage their own projects (no member management)

import { ORG_ROLES, OrgRoleValue } from '@/lib/types/organization';

export const ACTIONS = {
  TRANSFER_OWNERSHIP: 'TRANSFER_OWNERSHIP',
  REMOVE_MEMBER: 'REMOVE_MEMBER',
  UPDATE_MEMBER_ROLE: 'UPDATE_MEMBER_ROLE',
  LEAVE_ORGANIZATION: 'LEAVE_ORGANIZATION',
} as const;

// see https://www.better-auth.com/docs/plugins/organization#roles
export const getAllowedActionsForOthers = (role?: OrgRoleValue): string[] => {
  if (role === ORG_ROLES.OWNER)
    return [ACTIONS.TRANSFER_OWNERSHIP, ACTIONS.REMOVE_MEMBER, ACTIONS.UPDATE_MEMBER_ROLE];
  if (role === ORG_ROLES.ADMIN) return [ACTIONS.REMOVE_MEMBER, ACTIONS.UPDATE_MEMBER_ROLE];
  if (role === ORG_ROLES.MEMBER) return []; // Members cannot manage other members
  return [];
};
