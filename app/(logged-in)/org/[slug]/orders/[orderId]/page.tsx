/**
 * Order Detail Page
 * Displays full order information with inline editing capabilities
 */

'use client';

import { use, useState } from 'react';

import { useRouter } from 'next/navigation';

import { format } from 'date-fns';
import { Loader2, Trash2 } from 'lucide-react';
import type { z } from 'zod';

import type { OrderStatus } from '@/lib/db/schema';
import { trpc } from '@/lib/trpc/client';
import { updateOrderSchema } from '@/lib/trpc/schemas/orders';
import { cn } from '@/lib/utils';

import { useOrderActions } from '@/hooks/use-orders';
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
import { Field, FieldContent, FieldError, FieldLabel } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

import { statusColors } from '../utils';
import { OrderHistoryTable } from './components/order-history-table';
import { OrderHistoryTimeline } from './components/order-history-timeline';

// Skeleton for loading state
function OrderDetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />

      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-6 w-full max-w-sm" />
      </div>

      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

interface OrderDetailPageProps {
  params: Promise<{
    slug: string;
    orderId: string;
  }>;
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { organization: activeOrganization } = useOrganization();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const utils = trpc.useUtils();
  const activeOrgId = activeOrganization?.id;

  const { data: order, isLoading } = trpc.orders.get.useQuery(
    {
      id: resolvedParams.orderId,
      organizationId: activeOrgId ?? '',
    },
    {
      staleTime: 1000 * 60 * 2, // 2 minutes
      enabled: !!resolvedParams.orderId && !!activeOrgId,
    }
  );

  const { data: history = [], isLoading: isLoadingHistory } = trpc.orders.getHistory.useQuery(
    {
      orderId: resolvedParams.orderId,
      organizationId: activeOrgId ?? '',
    },
    {
      staleTime: 1000 * 60 * 2, // 2 minutes
      enabled: !!resolvedParams.orderId && !!activeOrgId,
    }
  );

  const { updateOrder, deleteOrder, isDeleting } = useOrderActions();

  const handleDelete = async () => {
    if (!activeOrgId) return;
    await deleteOrder({ id: resolvedParams.orderId, organizationId: activeOrgId ?? '' });
    router.push(`/org/${resolvedParams.slug}/orders`);
  };

  const handleValidate = (
    field: keyof Omit<z.infer<typeof updateOrderSchema>, 'id'>,
    value: string | number | Date | OrderStatus
  ) => {
    if (!order || !activeOrgId) return;

    // Clear previous error for this field
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });

    // Validate using the schema (Zod will handle trimming)
    const updates = {
      id: resolvedParams.orderId,
      organizationId: activeOrgId,
      [field]: value,
    };
    const result = updateOrderSchema.safeParse(updates);

    if (!result.success) {
      const fieldError = result.error.issues.find((issue) => issue.path[0] === field);
      if (fieldError) {
        setFieldErrors((prev) => ({ ...prev, [field]: fieldError.message }));
      }
    }
  };

  const handleUpdate = async (
    field: keyof Omit<z.infer<typeof updateOrderSchema>, 'id'>,
    value: string | number | Date | OrderStatus
  ) => {
    if (!order || !activeOrgId) return;

    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });

    const updates = { id: resolvedParams.orderId, organizationId: activeOrgId, [field]: value };
    const result = updateOrderSchema.safeParse(updates);

    if (!result.success) {
      const fieldError = result.error.issues.find((issue) => issue.path[0] === field);
      if (fieldError) {
        setFieldErrors((prev) => ({ ...prev, [field]: fieldError.message }));
      }
      return;
    }

    const processedValue = result.data[field];
    const originalValue = order[field as keyof typeof order];
    if (originalValue === processedValue) return;

    // Optimistic update with validated data
    utils.orders.get.setData(
      { id: resolvedParams.orderId, organizationId: activeOrgId ?? '' },
      (old) => {
        if (!old) return old;
        return { ...old, [field]: processedValue };
      }
    );

    await updateOrder(result.data);
  };

  if (isLoading || !activeOrgId) {
    return <OrderDetailSkeleton />;
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <h3 className="mb-1 text-lg font-semibold">Order not found</h3>
        <p className="text-muted-foreground mb-4 text-sm">
          The order you&apos;re looking for doesn&apos;t exist, has been deleted, or you don&apos;t
          have permission to view it.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Order #{order.id.slice(0, 8).toUpperCase()}
          </h1>
          <Badge className={statusColors[order.status]}>{order.status}</Badge>
          <p className="text-muted-foreground mt-1 text-sm">
            {order.customerName} • ${Number(order.amount).toFixed(2)}
          </p>
          <div className="text-muted-foreground flex gap-2 text-sm">
            <span>Ordered {format(order.orderDate, 'PPP')}</span>
            <span>•</span>
            <span>by {order.userDisplayName || order.userEmail}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>
      {/* Order History Section with Tabs */}
      <Tabs defaultValue="timeline" className="space-y-4 md:space-y-8">
        <TabsList>
          <TabsTrigger value="timeline">Status Timeline</TabsTrigger>
          <TabsTrigger value="history">Detailed History</TabsTrigger>
        </TabsList>

        {/* Timeline View */}
        <TabsContent value="timeline" className="mt-4 md:mt-8">
          {isLoadingHistory ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <OrderHistoryTimeline history={history} currentStatus={order.status} />
          )}
        </TabsContent>

        {/* Table View */}
        <TabsContent value="history" className="space-y-4">
          <h2 className="leading-none font-semibold">Detailed History</h2>
          <p className="text-muted-foreground text-sm">
            Complete record of all status changes and updates
          </p>

          {isLoadingHistory ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <OrderHistoryTable history={history} />
          )}
        </TabsContent>
      </Tabs>

      {(order.notes || true) && (
        <Field data-invalid={!!fieldErrors.notes} className="mt-8">
          <FieldLabel htmlFor="notes">Notes</FieldLabel>
          <FieldContent>
            <Textarea
              id="notes"
              onChange={(e) => handleValidate('notes', e.target.value)}
              onBlur={(e) => handleUpdate('notes', e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.currentTarget.blur();
                }
              }}
              aria-invalid={!!fieldErrors.notes}
              className={cn(
                'min-h-24 max-w-md cursor-text resize-none border-transparent px-3 text-sm transition-all',
                'bg-transparent dark:bg-transparent',
                'focus:border-input dark:focus:border-input hover:bg-muted/50'
              )}
              placeholder="Add notes about this order..."
            />
            <FieldError>{fieldErrors.notes}</FieldError>
          </FieldContent>
        </Field>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete order for {order.customerName}. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 text-white"
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
