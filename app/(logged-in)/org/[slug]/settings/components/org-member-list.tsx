/**
 * Organization Member List
 * Display and manage organization members
 */

'use client';

import { useState } from 'react';
import { MoreHorizontal, Shield, ShieldBan, Trash2 } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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

interface OrgMemberListProps {
  organizationId: string;
}

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

export function OrgMemberList({ organizationId }: OrgMemberListProps) {
  const { user: currentUser } = useUser();
  const { members, isLoading, removeMember, isRemoving, updateMemberRole, isUpdatingRole } =
    useOrgMembers(organizationId);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);

  if (isLoading) {
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

  const confirmRemove = () => {
    if (memberToRemove) {
      removeMember({
        organizationId,
        memberId: memberToRemove,
      });
      setMemberToRemove(null);
    }
  };

  const handleRoleChange = (memberId: string, newRole: OrgRoleValue) => {
    updateMemberRole({
      organizationId,
      memberId,
      role: newRole,
    });
  };

  // Find current user's role
  const currentUserMembership = members.find((m) => m.userId === currentUser?.id);
  const isCurrentUserAdmin = currentUserMembership?.role === ORG_ROLES.ADMIN;

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
                    <Badge variant={member.role === ORG_ROLES.ADMIN ? 'default' : 'secondary'}>
                      {member.role === ORG_ROLES.ADMIN ? (
                        <>
                          <Shield className="mr-1 h-3 w-3" />
                          Admin
                        </>
                      ) : (
                        'Member'
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {isCurrentUserAdmin && !isCurrentUser && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
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
                          <DropdownMenuItem
                            onClick={() => handleRemove(member.id)}
                            disabled={isRemoving}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove Member
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              This member will lose access to this organization and all its resources. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemove}
              className="bg-destructive text-destructive-foreground"
            >
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
