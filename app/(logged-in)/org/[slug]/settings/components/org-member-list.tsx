/**
 * Organization Member List
 * Display and manage organization members
 */

'use client';

import { useState } from 'react';
import { MoreHorizontal, Shield, Loader2, Trash2 } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
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
import { useUser } from '@clerk/nextjs';
import { getInitials } from '@/lib/utils';

interface OrgMemberListProps {
  organizationId: string;
}

export function OrgMemberList({ organizationId }: OrgMemberListProps) {
  const { user: currentUser } = useUser();
  const { members, isLoading, removeMember, isRemoving, updateMemberRole, isUpdatingRole } =
    useOrgMembers(organizationId);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
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
        clerkUserId: memberToRemove,
      });
      setMemberToRemove(null);
    }
  };

  const handleRoleChange = (userId: string, newRole: 'org:admin' | 'org:member') => {
    updateMemberRole({
      organizationId,
      clerkUserId: userId,
      role: newRole,
    });
  };

  // Find current user's role
  const currentUserMembership = members.find((m) => m.userId === currentUser?.id);
  const isCurrentUserAdmin = currentUserMembership?.role === 'org:admin';

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
              const initials = getInitials(member.displayName);
              const isCurrentUser = member.userId === currentUser?.id;

              return (
                <TableRow key={member.membershipId}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {member.profileImageUrl && (
                          <AvatarImage
                            src={member.profileImageUrl}
                            alt={member.displayName || ''}
                          />
                        )}
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {member.displayName || 'Unknown'}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{member.email}</TableCell>
                  <TableCell>
                    <Badge variant={member.role === 'org:admin' ? 'default' : 'secondary'}>
                      {member.role === 'org:admin' ? (
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
                          {member.role === 'org:member' ? (
                            <DropdownMenuItem
                              onClick={() => handleRoleChange(member.userId, 'org:admin')}
                              disabled={isUpdatingRole}
                            >
                              <Shield className="mr-2 h-4 w-4" />
                              Make Admin
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleRoleChange(member.userId, 'org:member')}
                              disabled={isUpdatingRole}
                            >
                              Remove Admin
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleRemove(member.userId)}
                            disabled={isRemoving}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
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
