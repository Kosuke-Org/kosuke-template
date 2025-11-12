/**
 * Organization Member List
 * Display and manage organization members
 */

'use client';

import { useState } from 'react';
import { MoreHorizontal, Shield, ShieldBan, Trash2, LogOut, Loader2 } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useOrgMembers } from '@/hooks/use-org-members';
import { useUser } from '@/hooks/use-user';

import { getInitials } from '@/lib/utils';
import { ORG_ROLES, OrgRoleValue } from '@/lib/types/organization';
import { useActiveOrganization } from '@/hooks/use-active-organization';

function MemberListSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 3 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-48" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-16 rounded-full" />
              </TableCell>
              <TableCell className="text-right">
                <Skeleton className="h-8 w-8 ml-auto" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

const ACTIONS = {
  TRANSFER_OWNERSHIP: 'TRANSFER_OWNERSHIP',
  REMOVE_MEMBER: 'REMOVE_MEMBER',
  UPDATE_MEMBER_ROLE: 'UPDATE_MEMBER_ROLE',
  LEAVE_ORGANIZATION: 'LEAVE_ORGANIZATION',
} as const;

export function OrgMemberList() {
  const { user: currentUser } = useUser();
  const { activeOrganization: organization, isLoading: isLoadingOrganization } =
    useActiveOrganization();
  const organizationId = organization?.id;
  const {
    members,
    isLoading,
    removeMember,
    isRemoving,
    updateMemberRole,
    isUpdatingRole,
    leaveOrganization,
    isLeaving: isLeavingMutation,
  } = useOrgMembers(organizationId);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [isLeavingDialogOpen, setIsLeavingDialogOpen] = useState(false);

  if (!currentUser || isLoading || isLoadingOrganization) {
    return <MemberListSkeleton />;
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No members yet</p>
      </div>
    );
  }

  const handleRemove = (userId: string) => {
    setMemberToRemove(userId);
  };

  const handleLeave = () => {
    setIsLeavingDialogOpen(true);
  };

  const confirmRemove = () => {
    if (!organizationId || !memberToRemove) return;

    removeMember({ organizationId, memberIdOrEmail: memberToRemove });
    setMemberToRemove(null);
  };

  const confirmLeave = () => {
    if (!organizationId) return;

    leaveOrganization({ organizationId });
    setIsLeavingDialogOpen(false);
  };

  const handleRoleChange = (memberId: string, newRole: OrgRoleValue) => {
    if (!organizationId) return;

    updateMemberRole({
      organizationId,
      memberId,
      role: newRole,
    });
  };

  // Find current user's role
  const currentUserMembership = members.find((m) => m.userId === currentUser?.id);
  const currentUserRole = currentUserMembership?.role as OrgRoleValue;

  // Get allowed actions for current user's role on other members
  // owner: Full control - can perform any action
  // admin: Full control except deleting org or changing owner - can manage members but not transfer ownership
  // member: Limited control - can create projects, invite users, manage their own projects (no member management)
  // see https://www.better-auth.com/docs/plugins/organization#roles
  const getAllowedActionsForOthers = (role?: OrgRoleValue): string[] => {
    if (role === ORG_ROLES.OWNER)
      return [ACTIONS.TRANSFER_OWNERSHIP, ACTIONS.REMOVE_MEMBER, ACTIONS.UPDATE_MEMBER_ROLE];
    if (role === ORG_ROLES.ADMIN) return [ACTIONS.REMOVE_MEMBER, ACTIONS.UPDATE_MEMBER_ROLE];
    if (role === ORG_ROLES.MEMBER) return []; // Members cannot manage other members
    return [];
  };

  const getActionsForMember = (isCurrentUser: boolean): string[] => {
    if (isCurrentUser) return [ACTIONS.LEAVE_ORGANIZATION];
    return getAllowedActionsForOthers(currentUserRole);
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => {
              const { user } = member;
              const displayName = user.name || 'User';

              const initials = getInitials(displayName);
              const isCurrentUser = member.userId === currentUser?.id;

              return (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 rounded-lg">
                        {user.image && <AvatarImage src={user.image} alt={displayName} />}
                        <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {displayName}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <Badge
                      className="capitalize"
                      variant={member.role === ORG_ROLES.OWNER ? 'default' : 'secondary'}
                    >
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {(() => {
                      const actionsForMember = getActionsForMember(isCurrentUser);
                      if (actionsForMember.length === 0) return null;

                      return (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {isCurrentUser &&
                              actionsForMember.includes(ACTIONS.LEAVE_ORGANIZATION) && (
                                <DropdownMenuItem
                                  onClick={handleLeave}
                                  disabled={isLeavingMutation}
                                  className="text-destructive"
                                >
                                  <LogOut className="h-4 w-4" />
                                  Leave Organization
                                </DropdownMenuItem>
                              )}
                            {!isCurrentUser &&
                              actionsForMember.includes(ACTIONS.UPDATE_MEMBER_ROLE) && (
                                <>
                                  {member.role === ORG_ROLES.MEMBER ? (
                                    <DropdownMenuItem
                                      onClick={() => handleRoleChange(member.id, ORG_ROLES.ADMIN)}
                                      disabled={isUpdatingRole}
                                    >
                                      <Shield className="h-4 w-4" />
                                      Make Admin
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      onClick={() => handleRoleChange(member.id, ORG_ROLES.MEMBER)}
                                      disabled={isUpdatingRole}
                                    >
                                      <ShieldBan className="h-4 w-4" />
                                      Remove Admin
                                    </DropdownMenuItem>
                                  )}
                                </>
                              )}
                            {!isCurrentUser && actionsForMember.includes(ACTIONS.REMOVE_MEMBER) && (
                              <DropdownMenuItem
                                onClick={() => handleRemove(member.id)}
                                disabled={isRemoving}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                                Remove Member
                              </DropdownMenuItem>
                            )}
                            {!isCurrentUser &&
                              actionsForMember.includes(ACTIONS.TRANSFER_OWNERSHIP) && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      // TODO: Implement transfer ownership
                                      console.log('Transfer ownership to', member.id);
                                    }}
                                    disabled
                                  >
                                    <Shield className="h-4 w-4" />
                                    Transfer Ownership
                                  </DropdownMenuItem>
                                </>
                              )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      );
                    })()}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Remove Member Dialog */}
      <AlertDialog
        open={!!memberToRemove || isRemoving}
        onOpenChange={(open) => {
          if (!open) {
            setMemberToRemove(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              This member will lose access to this organization and all its resources. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemove}
              className="bg-destructive text-destructive-foreground"
              disabled={isRemoving}
            >
              {isRemoving && <Loader2 className="h-4 w-4 animate-spin" />}
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave Organization Dialog */}
      <AlertDialog
        open={isLeavingDialogOpen || isLeavingMutation}
        onOpenChange={(open) => {
          if (!open) {
            setIsLeavingDialogOpen(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave organization?</AlertDialogTitle>
            <AlertDialogDescription>
              You will lose access to this organization and all its resources. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLeavingMutation}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmLeave}
              className="bg-destructive text-destructive-foreground"
              disabled={isLeavingMutation}
            >
              {isLeavingMutation && <Loader2 className="h-4 w-4 animate-spin" />}
              Leave organization
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
