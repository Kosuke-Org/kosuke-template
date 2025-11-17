/**
 * Organization Member List
 * Display and manage organization members
 */

'use client';

import { useState } from 'react';

import { format } from 'date-fns';
import { Loader2, MoreHorizontal, Trash2 } from 'lucide-react';

import { ORG_ROLES } from '@/lib/types/organization';

import { useOrgInvitation } from '@/hooks/use-org-invitation';
import { useOrganization } from '@/hooks/use-organization';

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
import { Badge } from '@/components/ui/badge';
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

import { ACTIONS, getAllowedActionsForOthers } from '../utils';

export function OrgInvitationList() {
  const { invitations, currentUserRole } = useOrganization();
  const { cancelInvitation, isCancellingInvitation } = useOrgInvitation();
  const [invitationToCancel, setInvitationToCancel] = useState<string | null>(null);

  const handleCancelInvitation = (invitationId: string) => {
    setInvitationToCancel(invitationId);
  };

  const confirmCancelInvitation = () => {
    if (!invitationToCancel) return;

    cancelInvitation({ invitationId: invitationToCancel });
    setInvitationToCancel(null);
  };

  return (
    <>
      <div className="space-y-8">
        {/* Pending Invitations Table */}
        {invitations.length > 0 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Pending invitations</h3>
              <p className="text-muted-foreground text-sm">
                Invitations that are waiting to be accepted
              </p>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expires At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => {
                    const isExpired = new Date(invitation.expiresAt) < new Date();

                    return (
                      <TableRow key={invitation.id}>
                        <TableCell className="font-medium">{invitation.email}</TableCell>
                        <TableCell>
                          <Badge
                            className="capitalize"
                            variant={invitation.role === ORG_ROLES.OWNER ? 'default' : 'secondary'}
                          >
                            {invitation.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={isExpired ? 'destructive' : 'secondary'}>
                            {isExpired ? 'Expired' : invitation.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(invitation.expiresAt), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          {(() => {
                            const actionsForMember = getAllowedActionsForOthers(currentUserRole);
                            if (!actionsForMember.includes(ACTIONS.REMOVE_MEMBER)) return null;

                            return (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleCancelInvitation(invitation.id)}
                                    disabled={isCancellingInvitation}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Revoke Invitation
                                  </DropdownMenuItem>
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
        )}
      </div>

      {/* Cancel Invitation Dialog */}
      <AlertDialog
        open={!!invitationToCancel || isCancellingInvitation}
        onOpenChange={(open) => {
          if (!open) {
            setInvitationToCancel(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the pending invitation. The user will no longer be able to accept it.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancellingInvitation}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancelInvitation}
              className="bg-destructive text-destructive-foreground"
              disabled={isCancellingInvitation}
            >
              {isCancellingInvitation && <Loader2 className="h-4 w-4 animate-spin" />}
              Revoke Invitation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
