/**
 * Organization Member List
 * Display and manage organization members
 */

'use client';

import { useState } from 'react';

import { Loader2, LogOut, MoreHorizontal, Shield, ShieldBan, Trash2 } from 'lucide-react';

import { ORG_ROLES, OrgRoleValue } from '@/lib/types/organization';
import { getInitials } from '@/lib/utils';

import { useOrgMembers } from '@/hooks/use-org-members';
import { useOrganization } from '@/hooks/use-organization';
import { useUser } from '@/hooks/use-user';

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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { ACTIONS, getAllowedActionsForOthers } from '../utils';

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
                <Skeleton className="ml-auto h-8 w-8" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function OrgMemberList() {
  const { user: currentUser } = useUser();
  const {
    removeMember,
    isRemoving,
    updateMemberRole,
    isUpdatingRole,
    leaveOrganization,
    isLeaving: isLeavingMutation,
  } = useOrgMembers();
  const { members, isLoading, organization, currentUserRole, currentUserMembership } =
    useOrganization();

  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [isLeavingDialogOpen, setIsLeavingDialogOpen] = useState(false);
  const [memberToTransferOwnership, setMemberToTransferOwnership] = useState<string | null>(null);

  const organizationId = organization?.id;

  if (!currentUser || isLoading) {
    return <MemberListSkeleton />;
  }

  if (members.length === 0) {
    return (
      <div className="py-12 text-center">
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

  const handleTransferOwnership = (memberId: string) => {
    setMemberToTransferOwnership(memberId);
  };

  const confirmTransferOwnership = () => {
    if (!memberToTransferOwnership) return;

    handleRoleChange(memberToTransferOwnership, ORG_ROLES.OWNER, () => {
      // on transfer ownership success, demote current user to admin
      if (currentUserMembership?.id && currentUserMembership.id !== memberToTransferOwnership) {
        handleRoleChange(currentUserMembership.id, ORG_ROLES.ADMIN);
      }
      setMemberToTransferOwnership(null);
    });
  };

  const handleRoleChange = (memberId: string, newRole: OrgRoleValue, onSuccess?: () => void) => {
    if (!organizationId) return;

    updateMemberRole(
      {
        organizationId,
        memberId,
        role: newRole,
      },
      {
        onSuccess,
      }
    );
  };

  const getActionsForMember = (isCurrentUser: boolean, memberRole?: OrgRoleValue) => {
    if (isCurrentUser) {
      // Current user can always leave
      const actions: string[] = [ACTIONS.LEAVE_ORGANIZATION];

      // Admins can demote themselves to member
      if (currentUserRole === ORG_ROLES.ADMIN) {
        actions.push(ACTIONS.UPDATE_MEMBER_ROLE);
      }
      return actions;
    }

    return getAllowedActionsForOthers(currentUserRole, memberRole);
  };

  // Current user always appears first
  const sortedMembers = [...members].sort((a, b) => {
    const aIsCurrentUser = a.userId === currentUser?.id;
    const bIsCurrentUser = b.userId === currentUser?.id;
    if (aIsCurrentUser && !bIsCurrentUser) return -1;
    if (!aIsCurrentUser && bIsCurrentUser) return 1;
    return 0;
  });

  return (
    <>
      <div className="space-y-8">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Members</h3>
            <p className="text-muted-foreground text-sm">Members of the organization</p>
          </div>
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
                {sortedMembers.map((member) => {
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
                            <AvatarFallback className="bg-primary text-primary-foreground rounded-lg">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {displayName}
                              {isCurrentUser && (
                                <span className="text-muted-foreground ml-2 text-xs">(You)</span>
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
                          const actionsForMember = getActionsForMember(isCurrentUser, member.role);
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
                                  currentUserRole === ORG_ROLES.ADMIN &&
                                  actionsForMember.includes(ACTIONS.UPDATE_MEMBER_ROLE) && (
                                    <DropdownMenuItem
                                      onClick={() => handleRoleChange(member.id, ORG_ROLES.MEMBER)}
                                      disabled={isUpdatingRole}
                                    >
                                      <ShieldBan className="h-4 w-4" />
                                      Demote to Member
                                    </DropdownMenuItem>
                                  )}
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
                                      {member.role !== ORG_ROLES.ADMIN ? (
                                        <DropdownMenuItem
                                          onClick={() =>
                                            handleRoleChange(member.id, ORG_ROLES.ADMIN)
                                          }
                                          disabled={isUpdatingRole}
                                        >
                                          <Shield className="h-4 w-4" />
                                          Make Admin
                                        </DropdownMenuItem>
                                      ) : (
                                        <DropdownMenuItem
                                          onClick={() =>
                                            handleRoleChange(member.id, ORG_ROLES.MEMBER)
                                          }
                                          disabled={isUpdatingRole}
                                        >
                                          <ShieldBan className="h-4 w-4" />
                                          Remove Admin
                                        </DropdownMenuItem>
                                      )}
                                    </>
                                  )}
                                {!isCurrentUser &&
                                  actionsForMember.includes(ACTIONS.REMOVE_MEMBER) && (
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
                                        onClick={() => handleTransferOwnership(member.id)}
                                        disabled={isUpdatingRole}
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
        </div>
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
              className="bg-destructive hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 text-white"
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
              {currentUserRole === ORG_ROLES.OWNER
                ? 'You are the owner of this organization and cannot leave. You can transfer ownership to another member.'
                : 'You will lose access to this organization and all its resources. This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLeavingMutation}>Cancel</AlertDialogCancel>
            {currentUserRole !== ORG_ROLES.OWNER && (
              <AlertDialogAction
                onClick={confirmLeave}
                className="bg-destructive hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 text-white"
                disabled={isLeavingMutation}
              >
                {isLeavingMutation && <Loader2 className="h-4 w-4 animate-spin" />}
                Leave organization
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer Ownership Dialog */}
      <AlertDialog
        open={!!memberToTransferOwnership || (!!memberToTransferOwnership && isUpdatingRole)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transfer ownership?</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const member = members.find((m) => m.id === memberToTransferOwnership);
                const memberName = member?.user.name || member?.user.email || 'this member';
                return `You are about to transfer ownership of this organization to ${memberName}. You will be demoted to admin. This action cannot be undone.`;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdatingRole}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmTransferOwnership} disabled={isUpdatingRole}>
              {isUpdatingRole && <Loader2 className="h-4 w-4 animate-spin" />}
              Transfer Ownership
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
