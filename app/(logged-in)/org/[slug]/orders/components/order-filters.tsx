/**
 * Order Filters Component
 * Unified filter panel with apply button for better UX and reduced API calls
 */

'use client';

import { useEffect, useState } from 'react';
import { CalendarIcon, ListFilter, X } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { OrderStatus } from '@/lib/types';
import type { DateRange } from 'react-day-picker';
import { statusOptions, statusColors, MAX_AMOUNT } from '../utils';

interface OrderFiltersProps {
  selectedStatuses: OrderStatus[];
  dateFrom?: Date;
  dateTo?: Date;
  minAmount: number;
  maxAmount: number;
  activeFiltersCount: number;
  onStatusesChange: (statuses: OrderStatus[]) => void;
  onDateFromChange: (date?: Date) => void;
  onDateToChange: (date?: Date) => void;
  onAmountRangeChange: (min: number, max: number) => void;
}

export function OrderFilters({
  selectedStatuses,
  dateFrom,
  dateTo,
  minAmount,
  maxAmount,
  activeFiltersCount,
  onStatusesChange,
  onDateFromChange,
  onDateToChange,
  onAmountRangeChange,
}: OrderFiltersProps) {
  const [open, setOpen] = useState(false);
  const [pendingStatuses, setPendingStatuses] = useState<OrderStatus[]>(selectedStatuses);
  const [pendingDateRange, setPendingDateRange] = useState<DateRange | undefined>({
    from: dateFrom,
    to: dateTo,
  });
  const [pendingAmountRange, setPendingAmountRange] = useState([minAmount, maxAmount]);

  useEffect(() => {
    setPendingStatuses(selectedStatuses);
  }, [selectedStatuses]);

  useEffect(() => {
    setPendingDateRange({ from: dateFrom, to: dateTo });
  }, [dateFrom, dateTo]);

  useEffect(() => {
    setPendingAmountRange([minAmount, maxAmount]);
  }, [minAmount, maxAmount]);

  const handleStatusToggle = (status: OrderStatus) => {
    if (pendingStatuses.includes(status)) {
      setPendingStatuses(pendingStatuses.filter((s) => s !== status));
    } else {
      setPendingStatuses([...pendingStatuses, status]);
    }
  };

  const handleApply = () => {
    onStatusesChange(pendingStatuses);
    onDateFromChange(pendingDateRange?.from);
    onDateToChange(pendingDateRange?.to);
    onAmountRangeChange(pendingAmountRange[0], pendingAmountRange[1]);
    setOpen(false);
  };

  const handleCancel = () => {
    setPendingStatuses(selectedStatuses);
    setPendingDateRange({ from: dateFrom, to: dateTo });
    setPendingAmountRange([minAmount, maxAmount]);
    setOpen(false);
  };

  const hasPendingChanges =
    JSON.stringify(pendingStatuses.sort()) !== JSON.stringify([...selectedStatuses].sort()) ||
    pendingDateRange?.from?.getTime() !== dateFrom?.getTime() ||
    pendingDateRange?.to?.getTime() !== dateTo?.getTime() ||
    pendingAmountRange[0] !== minAmount ||
    pendingAmountRange[1] !== maxAmount;

  const getDateRangeText = () => {
    if (pendingDateRange?.from && pendingDateRange?.to) {
      return `${format(pendingDateRange.from, 'MMM d')} - ${format(pendingDateRange.to, 'MMM d, yyyy')}`;
    }
    if (pendingDateRange?.from) {
      return `From ${format(pendingDateRange.from, 'MMM d, yyyy')}`;
    }
    if (pendingDateRange?.to) {
      return `Until ${format(pendingDateRange.to, 'MMM d, yyyy')}`;
    }
    return 'Any date';
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2">
          <ListFilter />
          Filters
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="start" side="bottom" sideOffset={4}>
        <div className="p-4 space-y-4">
          {/* Status Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Status</Label>
            <div className="space-y-2">
              {statusOptions.map((option) => (
                <div key={option.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`status-${option.value}`}
                    checked={pendingStatuses.includes(option.value)}
                    onCheckedChange={() => handleStatusToggle(option.value)}
                  />
                  <label
                    htmlFor={`status-${option.value}`}
                    className="text-sm leading-none cursor-pointer flex-1"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Date Range Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Order Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal h-9',
                    !pendingDateRange?.from && !pendingDateRange?.to && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  <span className="text-sm">{getDateRangeText()}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={pendingDateRange}
                  onSelect={setPendingDateRange}
                  numberOfMonths={2}
                  disabled={(date) => date > new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          <Separator />

          {/* Amount Range Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Amount Range</Label>
            <Slider
              value={pendingAmountRange}
              onValueChange={setPendingAmountRange}
              max={MAX_AMOUNT}
              step={50}
              className="w-full"
            />
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    value={pendingAmountRange[0]}
                    onChange={(e) => {
                      const value = Math.max(
                        0,
                        Math.min(Number(e.target.value), pendingAmountRange[1])
                      );
                      setPendingAmountRange([value, pendingAmountRange[1]]);
                    }}
                    className="pl-6 h-9 text-sm"
                    placeholder="Min"
                  />
                </div>
              </div>
              <span className="text-muted-foreground text-sm">—</span>
              <div className="flex-1">
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    value={pendingAmountRange[1]}
                    onChange={(e) => {
                      const value = Math.min(
                        MAX_AMOUNT,
                        Math.max(Number(e.target.value), pendingAmountRange[0])
                      );
                      setPendingAmountRange([pendingAmountRange[0], value]);
                    }}
                    className="pl-6 h-9 text-sm"
                    placeholder="Max"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t px-3 py-2 flex items-center justify-between bg-muted/30">
          <Button variant="ghost" size="sm" onClick={handleCancel} className="h-8">
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleApply} disabled={!hasPendingChanges} className="h-8">
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Separate component for active filter badges
interface ActiveFilterBadgesProps {
  selectedStatuses: OrderStatus[];
  dateFrom?: Date;
  dateTo?: Date;
  minAmount: number;
  maxAmount: number;
  onStatusesChange: (statuses: OrderStatus[]) => void;
  onDateFromChange: (date?: Date) => void;
  onDateToChange: (date?: Date) => void;
  onAmountRangeChange: (min: number, max: number) => void;
}

export function ActiveFilterBadges({
  selectedStatuses,
  dateFrom,
  dateTo,
  minAmount,
  maxAmount,
  onStatusesChange,
  onDateFromChange,
  onDateToChange,
  onAmountRangeChange,
}: ActiveFilterBadgesProps) {
  const hasActiveFilters =
    selectedStatuses.length > 0 ||
    dateFrom !== undefined ||
    dateTo !== undefined ||
    minAmount > 0 ||
    maxAmount < MAX_AMOUNT;

  if (!hasActiveFilters) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {selectedStatuses.map((status) => (
        <Badge
          key={status}
          variant="outline"
          className={`h-7 gap-1 pl-2 pr-1 ${statusColors[status]}`}
        >
          {statusOptions.find((s) => s.value === status)?.label}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onStatusesChange(selectedStatuses.filter((s) => s !== status))}
            className="h-4 w-4 p-0 hover:bg-transparent"
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}
      {(dateFrom || dateTo) && (
        <Badge variant="secondary" className="h-7 gap-2 pl-2 pr-1">
          <CalendarIcon />
          {dateFrom && dateTo
            ? `${format(dateFrom, 'MMM d')} - ${format(dateTo, 'MMM d')}`
            : dateFrom
              ? `From ${format(dateFrom, 'MMM d')}`
              : `Until ${format(dateTo!, 'MMM d')}`}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onDateFromChange(undefined);
              onDateToChange(undefined);
            }}
            className="h-4 w-4 p-0 hover:bg-transparent"
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )}
      {(minAmount > 0 || maxAmount < MAX_AMOUNT) && (
        <Badge variant="secondary" className="h-7 gap-1 pl-2 pr-1">
          ${minAmount} - ${maxAmount}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAmountRangeChange(0, MAX_AMOUNT)}
            className="h-4 w-4 p-0 hover:bg-transparent"
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )}
    </div>
  );
}
