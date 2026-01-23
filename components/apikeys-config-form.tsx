'use client';

import { useState } from 'react';

import { Eye, EyeOff, Loader2, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import { CONFIG_KEYS, type ConfigKey } from '@/lib/services/constants';
import { trpc } from '@/lib/trpc/client';

import { useToast } from '@/hooks/use-toast';

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
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

interface EditingState {
  key: ConfigKey;
  value: string;
  showValue: boolean;
}

/**
 * System configuration form for managing system-wide secrets
 * Only accessible to superadmins
 */
export function ApiKeysConfigForm() {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [editingConfig, setEditingConfig] = useState<EditingState | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<ConfigKey | null>(null);

  // Fetch config status for all keys
  const { data: configStatus, isLoading } = trpc.admin.config.list.useQuery(undefined, {
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Mutations
  const setConfigMutation = trpc.admin.config.set.useMutation({
    onSuccess: (_, variables) => {
      toast({
        title: 'Success',
        description: `Configuration ${variables.key} updated successfully`,
      });
      utils.admin.config.list.invalidate();
      setEditingConfig(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteConfigMutation = trpc.admin.config.delete.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Configuration deleted successfully',
      });
      utils.admin.config.list.invalidate();
      setDeleteDialogOpen(false);
      setConfigToDelete(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleEditClick = (key: ConfigKey) => {
    setEditingConfig({
      key,
      value: '',
      showValue: false,
    });
  };

  const handleCancelEdit = () => {
    setEditingConfig(null);
  };

  const handleSave = async () => {
    const trimmedValue = editingConfig?.value.trim();
    if (!editingConfig || !trimmedValue) {
      toast({
        title: 'Error',
        description: 'Value cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    await setConfigMutation.mutateAsync({
      key: editingConfig.key,
      value: trimmedValue,
    });
  };

  const handleDeleteClick = (key: ConfigKey) => {
    setConfigToDelete(key);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!configToDelete) return;
    await deleteConfigMutation.mutateAsync({ key: configToDelete });
  };

  const toggleShowValue = () => {
    if (!editingConfig) return;
    setEditingConfig({
      ...editingConfig,
      showValue: !editingConfig.showValue,
    });
  };

  if (isLoading) {
    return (
      <Card className="max-w-3xl">
        <CardContent className="space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-10" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!configStatus) {
    return (
      <p className="text-muted-foreground text-sm">
        Failed to load configuration status. Please try again later.
      </p>
    );
  }

  const mapKeysReadableNames: Record<ConfigKey, string> = {
    STRIPE_SECRET_KEY: 'Stripe API Key',
    STRIPE_PUBLISHABLE_KEY: 'Stripe Public Key',
    STRIPE_WEBHOOK_SECRET: 'Stripe Webhook Secret',
    GOOGLE_AI_API_KEY: 'Google API Key',
  };

  return (
    <>
      <Card className="max-w-3xl">
        <CardContent className="space-y-6">
          {Object.values(CONFIG_KEYS).map((key) => {
            const status = configStatus[key];
            const isEditing = editingConfig?.key === key;
            const isPending =
              setConfigMutation.isPending && setConfigMutation.variables?.key === key;

            return (
              <div key={key} className="space-y-2">
                <h3 className="text-sm font-medium">{mapKeysReadableNames[key]}</h3>

                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <div className="relative flex-1">
                        <Input
                          type={editingConfig.showValue ? 'text' : 'password'}
                          value={editingConfig.value}
                          onChange={(e) =>
                            setEditingConfig({ ...editingConfig, value: e.target.value })
                          }
                          placeholder={status.exists ? 'Enter new value' : 'Enter value'}
                          disabled={isPending}
                          className="pr-10 text-sm"
                          autoFocus
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 p-0"
                          onClick={toggleShowValue}
                          disabled={isPending}
                        >
                          {editingConfig.showValue ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={isPending || !editingConfig.value.trim()}
                        className="text-xs"
                      >
                        {isPending ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Saving
                          </>
                        ) : (
                          'Save'
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                        disabled={isPending}
                        className="text-xs"
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <div
                        className="min-w-0 flex-1 cursor-pointer text-sm"
                        onDoubleClick={() => handleEditClick(key)}
                      >
                        {status.exists ? (
                          status.maskedValue
                        ) : (
                          <span className="text-muted-foreground italic">Not configured</span>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClick(key);
                            }}
                          >
                            <Pencil />
                            Edit
                          </DropdownMenuItem>
                          {status.exists && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(key);
                              }}
                              className="text-destructive hover:!text-destructive"
                            >
                              <Trash2 className="text-destructive h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {configToDelete &&
                `This will permanently delete the configuration for "${configToDelete}". This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteConfigMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteConfigMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteConfigMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
