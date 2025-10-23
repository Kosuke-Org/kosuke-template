/**
 * Order Dialog Component
 * Form for creating and editing orders
 */

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormField } from '@/components/ui/form';
import { Field, FieldContent, FieldLabel, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { createOrderSchema } from '@/lib/trpc/schemas/orders';

// Client-side form schema - transform amount to number for better UX
const orderFormSchema = createOrderSchema.omit({ organizationId: true }).extend({
  amount: z.number().positive('Amount must be greater than 0'),
});

type OrderFormValues = z.infer<typeof orderFormSchema>;
type OrderApiValues = Omit<z.infer<typeof createOrderSchema>, 'organizationId'>;

interface OrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: OrderApiValues) => Promise<void>;
  initialValues?: Partial<OrderFormValues>;
  mode: 'create' | 'edit';
  isSubmitting: boolean;
}

export function OrderDialog({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
  mode,
  isSubmitting,
}: OrderDialogProps) {
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: initialValues ?? {
      customerName: '',
      amount: 0,
      status: 'pending',
      notes: '',
    },
  });

  const handleSubmit = async (values: OrderFormValues) => {
    // Convert amount from number to string with 2 decimal places for API/DB
    await onSubmit({
      ...values,
      amount: values.amount.toFixed(2),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Order' : 'Edit Order'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Add a new order to track customer purchases.'
              : 'Update order details.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="customerName"
              render={({ field, fieldState }) => (
                <Field data-invalid={!!fieldState.error}>
                  <FieldLabel htmlFor="customerName">Customer Name</FieldLabel>
                  <FieldContent>
                    <Input
                      id="customerName"
                      placeholder="John Doe"
                      aria-invalid={!!fieldState.error}
                      {...field}
                    />
                    <FieldError>{fieldState.error?.message}</FieldError>
                  </FieldContent>
                </Field>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field, fieldState }) => (
                <Field data-invalid={!!fieldState.error}>
                  <FieldLabel htmlFor="amount">Amount (USD)</FieldLabel>
                  <FieldContent>
                    <Input
                      id="amount"
                      placeholder="0.00"
                      type="number"
                      min="0"
                      step="0.01"
                      value={field.value || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        field.onChange(value);
                      }}
                      aria-invalid={!!fieldState.error}
                    />
                    <FieldError>{fieldState.error?.message}</FieldError>
                  </FieldContent>
                </Field>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field, fieldState }) => (
                  <Field data-invalid={!!fieldState.error}>
                    <FieldLabel htmlFor="status">Status</FieldLabel>
                    <FieldContent>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger id="status" aria-invalid={!!fieldState.error}>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="shipped">Shipped</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </FieldContent>
                  </Field>
                )}
              />

              <FormField
                control={form.control}
                name="orderDate"
                render={({ field, fieldState }) => (
                  <Field data-invalid={!!fieldState.error}>
                    <FieldLabel htmlFor="orderDate">Order Date</FieldLabel>
                    <FieldContent>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="orderDate"
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                            aria-invalid={!!fieldState.error}
                          >
                            {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                          />
                        </PopoverContent>
                      </Popover>
                      <FieldError>{fieldState.error?.message}</FieldError>
                    </FieldContent>
                  </Field>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field, fieldState }) => (
                <Field data-invalid={!!fieldState.error}>
                  <FieldLabel htmlFor="notes">Notes (Optional)</FieldLabel>
                  <FieldContent>
                    <Textarea
                      id="notes"
                      placeholder="Add any additional notes about this order..."
                      className="resize-none"
                      rows={3}
                      aria-invalid={!!fieldState.error}
                      {...field}
                    />
                    <FieldError>{fieldState.error?.message}</FieldError>
                  </FieldContent>
                </Field>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Order' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
