/**
 * Order Detail Page
 * Displays full order information with inline editing capabilities
 */

'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash, Calendar, User, CircleDollarSign, Info, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Field, FieldContent, FieldError } from '@/components/ui/field';
import { trpc } from '@/lib/trpc/client';
import { useActiveOrganization } from '@/hooks/use-active-organization';
import { useOrderActions } from '@/hooks/use-orders';
import { orderStatusEnum, type OrderStatus } from '@/lib/db/schema';
import { statusColors } from '../utils';
import { format } from 'date-fns';
import { updateOrderSchema } from '@/lib/trpc/schemas/orders';
import type { z } from 'zod';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// Skeleton for loading state
function OrderDetailSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-10 w-24" />
      <div className="space-y-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-6 w-full max-w-md" />
          </div>
        ))}
      </div>
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
  const { activeOrgId } = useActiveOrganization();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const utils = trpc.useUtils();

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
        <h3 className="font-semibold text-lg mb-1">Order not found</h3>
        <p className="text-sm text-muted-foreground mb-4">
          The order you&apos;re looking for doesn&apos;t exist, has been deleted, or you don&apos;t
          have permission to view it.
        </p>
        <Button asChild>
          <Link href={`/org/${resolvedParams.slug}/orders`}>
            <ArrowLeft /> Back to orders
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-2">
      <Button
        asChild
        variant="ghost"
        className="text-sm text-muted-foreground hover:text-muted-foreground"
      >
        <Link href={`/org/${resolvedParams.slug}/orders`}>
          <ArrowLeft className="h-4 w-4" />
          Back to orders
        </Link>
      </Button>

      <h1 className="text-xl font-semibold">Order Details</h1>

      <div className="mt-4">
        {/* Order ID */}
        <div className="flex items-center gap-4 py-1.5">
          <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="text-sm text-muted-foreground w-28 shrink-0">Order ID</div>
          <div className="flex-1 min-w-0 px-3 -mx-3">
            <div className="text-sm text-muted-foreground truncate">{order.id}</div>
          </div>
        </div>

        {/* Customer Name */}
        <Field data-invalid={!!fieldErrors.customerName}>
          <div className="flex items-start gap-4 py-1.5">
            <User className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
            <div className="text-sm text-muted-foreground w-28 shrink-0 pt-2">Customer</div>
            <FieldContent className="flex-1">
              <div className="hover:bg-muted/50 rounded-md transition-colors">
                <Input
                  id="customerName"
                  defaultValue={order.customerName}
                  onChange={(e) => handleValidate('customerName', e.target.value)}
                  onBlur={(e) => handleUpdate('customerName', e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') {
                      e.currentTarget.blur();
                    }
                  }}
                  aria-invalid={!!fieldErrors.customerName}
                  className={cn(
                    'h-9 text-sm border-0 cursor-text bg-transparent dark:bg-transparent',
                    'focus:border-input dark:focus:border-input'
                  )}
                  placeholder="Enter customer name"
                />
              </div>
              <FieldError>{fieldErrors.customerName}</FieldError>
            </FieldContent>
          </div>
        </Field>

        {/* Status */}
        <div className="group flex items-center gap-4 py-1.5">
          <Info className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="text-sm text-muted-foreground w-28 shrink-0">Status</div>
          <div className="flex-1 hover:bg-muted/50 rounded-md transition-colors">
            <Select
              value={order.status}
              onValueChange={(value) => handleUpdate('status', value as OrderStatus)}
            >
              <SelectTrigger className="[&_svg]:!hidden [&_svg]:fill-red-300 w-full border-0 bg-transparent dark:bg-transparent dark:hover:bg-transparent hover:bg-transparent">
                <Badge className={statusColors[order.status]}>{order.status}</Badge>
              </SelectTrigger>
              <SelectContent className="!w-[120px]">
                {orderStatusEnum.enumValues.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Amount */}
        <Field data-invalid={!!fieldErrors.amount}>
          <div className="flex items-start gap-4 py-1.5">
            <CircleDollarSign className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
            <div className="text-sm text-muted-foreground w-28 shrink-0 pt-2">Amount</div>
            <FieldContent className="flex-1">
              <div className="hover:bg-muted/50 rounded-md transition-colors">
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={order.amount}
                  onChange={(e) => handleValidate('amount', e.target.value)}
                  onBlur={(e) => handleUpdate('amount', e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') {
                      e.currentTarget.blur();
                    }
                  }}
                  aria-invalid={!!fieldErrors.amount}
                  className={cn(
                    'h-9 text-sm border-0 cursor-text bg-transparent dark:bg-transparent',
                    'focus:border-input dark:focus:border-input'
                  )}
                  placeholder="0.00"
                />
              </div>
              <FieldError>{fieldErrors.amount}</FieldError>
            </FieldContent>
          </div>
        </Field>

        {/* Order Date */}
        <div className="group flex items-center gap-4 py-1.5">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="text-sm text-muted-foreground w-28 shrink-0">Date</div>
          <div className="flex-1 hover:bg-muted/50 rounded-md transition-colors">
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-auto w-full px-3 justify-start text-left hover:bg-transparent focus:bg-transparent"
                >
                  {format(order.orderDate, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={order.orderDate}
                  onSelect={(date) => {
                    if (date) {
                      handleUpdate('orderDate', date);
                      setCalendarOpen(false);
                    }
                  }}
                  disabled={(date) => date > new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Notes */}
        <Field data-invalid={!!fieldErrors.notes}>
          <div className="flex items-start gap-4 py-1.5">
            <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
            <div className="text-sm text-muted-foreground w-28 shrink-0 pt-2">Notes</div>
            <FieldContent className="flex-1">
              <div className="hover:bg-muted/50 rounded-md transition-colors">
                <Textarea
                  defaultValue={order.notes ?? ''}
                  onChange={(e) => handleValidate('notes', e.target.value)}
                  onBlur={(e) => handleUpdate('notes', e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.currentTarget.blur();
                    }
                  }}
                  aria-invalid={!!fieldErrors.notes}
                  className={cn(
                    'min-h-10 max-w-full text-sm resize-none flex-1 transition-all border-transparent px-3 cursor-text',
                    'bg-transparent dark:bg-transparent',
                    'focus:border-input dark:focus:border-input hover:bg-muted/50'
                  )}
                  placeholder="Add notes..."
                />
              </div>
              <FieldError>{fieldErrors.notes}</FieldError>
            </FieldContent>
          </div>
        </Field>

        {/* Metadata */}
        <div className="pt-6 space-y-1">
          <div className="flex items-center py-1.5  text-xs text-muted-foreground">
            <span>Created by {order.userDisplayName || order.userEmail}</span>
            <span className="mx-2">•</span>
            <span>{format(order.createdAt, 'PPP')}</span>
          </div>
          <div className="flex items-center py-1.5  text-xs text-muted-foreground">
            <span>Last updated {format(order.updatedAt, 'PPP')}</span>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
          <Trash />
          Delete order
        </Button>
      </div>

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
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
