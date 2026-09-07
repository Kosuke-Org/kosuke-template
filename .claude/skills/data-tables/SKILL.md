---
name: data-tables
description: Data table reference - the useTableSearch/useTableFilters/useTableSorting/useTablePagination hooks, the controlled page-orchestrates-state pattern, shared data-table components, and the full table + detail page file structure with worked examples. Load when building or changing a list/table page or its detail page.
---

# Data Tables & Detail Pages

**ALWAYS use table hooks for table operations to avoid code duplication. These hooks provide consistent patterns for search, filtering, sorting, and pagination across all table implementations.**

#### **📊 Table Hooks - MANDATORY**

**Use these hooks for ALL table operations to maintain consistency and avoid duplication:**

- **`useTableSearch`** - Debounced search with immediate input value and debounced query value
- **`useTableFilters`** - Filter state management with pending state
- **`useTableSorting`** - Sort state management with direction handling
- **`useTablePagination`** - Pagination state with page size management

#### **🔧 Implementation Pattern**

**The correct pattern is to use table hooks in the page component and pass everything as props to the data table component. This follows the "controlled component" pattern where the page orchestrates all state and data fetching.**

**✅ CORRECT - Page component with table hooks:**

```typescript
// app/(logged-in)/org/[slug]/features/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { trpc } from '@/lib/trpc/client';
import { useTableFilters } from '@/hooks/use-table-filters';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { useTableSearch } from '@/hooks/use-table-search';
import { useTableSorting } from '@/hooks/use-table-sorting';

import { FeatureDataTable } from './components/feature-data-table';

export default function FeaturesPage() {
  const router = useRouter();

  // Use individual table hooks
  const { inputValue, searchValue, setSearchValue } = useTableSearch({
    initialValue: '',
    debounceMs: 300,
  });

  const { sortBy, sortOrder, handleSort } = useTableSorting<'name' | 'createdAt'>({
    initialSortBy: 'createdAt',
    initialSortOrder: 'desc',
  });

  const { page, pageSize, setPage, setPageSize, goToFirstPage } = useTablePagination({
    initialPage: 1,
    initialPageSize: 10,
  });

  const { filters, updateFilter, resetFilters } = useTableFilters({
    selectedStatuses: [] as FeatureStatus[],
    // ... other filters
  });

  // Fetch data using the table state
  const { data, isLoading } = trpc.feature.list.useQuery({
    searchQuery: searchValue.trim() || undefined,
    statuses: filters.selectedStatuses.length > 0 ? filters.selectedStatuses : undefined,
    page,
    limit: pageSize,
    sortBy,
    sortOrder,
  });

  const handleClearFilters = () => {
    resetFilters();
    goToFirstPage();
  };

  return (
    <div className="space-y-6">
      <FeatureDataTable
        features={data?.features ?? []}
        total={data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        totalPages={data?.totalPages ?? 0}
        isLoading={isLoading}
        // Filter props - pass inputValue for immediate UI updates
        searchQuery={inputValue}
        selectedStatuses={filters.selectedStatuses}
        // Sorting props
        sortBy={sortBy}
        sortOrder={sortOrder}
        // Event handlers
        onSearchChange={setSearchValue}
        onStatusesChange={(statuses) => {
          updateFilter('selectedStatuses', statuses);
          goToFirstPage();
        }}
        onClearFilters={handleClearFilters}
        onSortChange={handleSort}
        // Pagination handlers
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        // Action handlers
        onView={(id) => router.push(`/features/${id}`)}
        onEdit={(id) => {/* ... */}}
        onDelete={(id) => {/* ... */}}
      />
    </div>
  );
}
```

**✅ CORRECT - Data table as controlled component:**

```typescript
// components/feature-data-table.tsx
'use client';

import { useMemo } from 'react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';

interface FeatureDataTableProps {
  // Data props
  features: FeatureWithDetails[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  isLoading: boolean;
  // Filter props
  searchQuery: string;
  selectedStatuses: FeatureStatus[];
  // Sorting props
  sortBy: 'name' | 'createdAt';
  sortOrder: 'asc' | 'desc';
  // Event handlers
  onSearchChange: (query: string) => void;
  onStatusesChange: (statuses: FeatureStatus[]) => void;
  onClearFilters: () => void;
  onSortChange: (column: 'name' | 'createdAt') => void;
  // Pagination handlers
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  // Action handlers
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function FeatureDataTable({
  features,
  total,
  page,
  pageSize,
  totalPages,
  isLoading,
  searchQuery,
  selectedStatuses,
  sortBy,
  sortOrder,
  onSearchChange,
  onStatusesChange,
  onClearFilters,
  onSortChange,
  onPageChange,
  onPageSizeChange,
  onView,
  onEdit,
  onDelete,
}: FeatureDataTableProps) {
  const columns = useMemo(
    () => getFeatureColumns({ onView, onEdit, onDelete }, { sortBy, sortOrder, onSort: onSortChange }),
    [onView, onEdit, onDelete, sortBy, sortOrder, onSortChange]
  );

  const table = useReactTable({
    data: features,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount: totalPages,
    state: {
      pagination: {
        pageIndex: page - 1,
        pageSize,
      },
    },
  });

  return (
    <>
      {/* Search and Filters */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <FeatureFilters
          selectedStatuses={selectedStatuses}
          onStatusesChange={onStatusesChange}
        />
        {/* ... */}
      </div>

      {/* Table */}
      <Table>
        {/* ... table implementation */}
      </Table>

      {/* Pagination */}
      <DataTablePagination
        table={table}
        totalRecords={total}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </>
  );
}
```

**❌ WRONG - Manual table state management:**

```typescript
// ❌ NO! Don't manually manage table state
const [searchQuery, setSearchQuery] = useState('');
const [filters, setFilters] = useState({});
const [sortBy, setSortBy] = useState('name');
const [sortOrder, setSortOrder] = useState('asc');
const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(10);

// This creates duplication across every table component!
```

**❌ WRONG - Data fetching inside data table component:**

```typescript
// ❌ NO! Don't fetch data inside the table component
export function FeatureDataTable() {
  // Don't do this - data fetching should be in the page component
  const { data } = trpc.feature.list.useQuery({...});
  // ...
}
```

#### **🏗️ Common Table Components**

**Reusable table components that work with table hooks:**

- **`DataTablePagination`** - Standard pagination component
- **`DataTableColumnHeader`** - Sortable column headers
- **`DataTableFilters`** - Generic filter component
- **`DataTableSearch`** - Search input with debouncing
- **`DataTableToolbar`** - Combined search, filters, and actions

#### **📋 Table Hook Benefits**

- ✅ **Consistency** - Same behavior across all tables
- ✅ **DRY Principle** - No duplication of table logic
- ✅ **Type Safety** - Proper TypeScript integration
- ✅ **Testing** - Centralized logic is easier to test
- ✅ **Maintenance** - Updates in one place affect all tables
- ✅ **Performance** - Optimized debouncing with separate input and query values
- ✅ **UX** - Responsive input field with debounced API calls

#### **📊 Table Hook Details**

**`useTableSearch`** - Debounced search with separate input and query values:

- `inputValue` - Immediate value for input field (responsive UI)
- `searchValue` - Debounced value for API queries (optimized performance)
- `setSearchValue` - Updates both values with debouncing

**`useTableFilters`** - Generic filter state management:

- `filters` - Current filter values
- `updateFilter` - Update a single filter
- `updateFilters` - Update multiple filters at once
- `resetFilters` - Reset all filters to initial values
- `clearFilter` - Clear a single filter

**`useTableSorting`** - Column-based sorting:

- `sortBy` - Current sort column
- `sortOrder` - Current sort direction ('asc' | 'desc')
- `handleSort` - Toggle sort for a column

**`useTableRowSelection`** - Row selection state for bulk actions (also available in `hooks/`).

**`useTablePagination`** - Page and page size management:

- `page` - Current page number
- `pageSize` - Items per page
- `setPage` - Change page
- `setPageSize` - Change page size
- `goToFirstPage` - Reset to page 1

**Always use these hooks in page components and pass state/handlers as props to data table components.**

### Table + Detail Page Implementation Patterns

**MANDATORY patterns for implementing table + detail page features following the orders implementation.**

#### **🏗️ File Structure & Organization**

**Required Directory Structure:**

```
app/(logged-in)/org/[slug]/{feature}/
├── page.tsx                           # Main table page
├── [id]/page.tsx                     # Detail page
├── components/
│   ├── {feature}-data-table.tsx      # Main table component
│   ├── {feature}-columns.tsx         # Column definitions
│   ├── {feature}-filters.tsx         # Filter components
│   ├── data-table-pagination.tsx     # Reusable pagination
│   ├── data-table-column-header.tsx  # Reusable column header
│   └── utils.ts                       # Feature-specific utilities
└── utils.ts                          # Feature constants and helpers
```

**Component Colocation Rules:**

- **Feature-specific components** MUST be colocated in `app/(logged-in)/org/[slug]/{feature}/components/`
- **Global reusable components** go in `components/ui/` or `components/`
- **NEVER create separate skeleton files** - define skeletons within the page/component files
- **Export schemas from centralized locations** - `lib/trpc/schemas/{feature}.ts`

**Detail Page Navigation - MANDATORY:**

- **NEVER create back buttons in detail pages** - Users should use browser back button or breadcrumbs
- Detail pages should focus on content, not navigation controls
- The sidebar and breadcrumbs provide sufficient navigation context
- Removing back buttons keeps the UI clean and consistent across all detail views

#### **📊 Table Implementation Pattern**

**Main Data Table Component Structure:**

```typescript
'use client';

import * as React from 'react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { Search, X, ChevronDown, Loader2 } from 'lucide-react';
import type { inferRouterOutputs } from '@trpc/server';
// ... other imports

// Infer types from tRPC router
type RouterOutput = inferRouterOutputs<AppRouter>;
type FeatureWithDetails = RouterOutput['{feature}']['list']['{feature}s'][number];

interface FeatureDataTableProps {
  // Data props
  {feature}s: FeatureWithDetails[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;

  // Filter props
  searchQuery: string;
  // ... other filter props

  // Sorting props
  sortBy: 'field1' | 'field2';
  sortOrder: 'asc' | 'desc';

  // Event handlers
  onSearchChange: (query: string) => void;
  // ... other filter handlers
  onSortChange: (column: 'field1' | 'field2') => void;

  // Pagination handlers
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;

  // Action handlers
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;

  // Export handler
  onExport: (type: ExportType) => void;
  isExporting: boolean;
}

export function FeatureDataTable({ /* props */ }: FeatureDataTableProps) {
  const columns = React.useMemo(
    () => getFeatureColumns({ onView, onEdit, onDelete }, { sortBy, sortOrder, onSort: onSortChange }),
    [onView, onEdit, onDelete, sortBy, sortOrder, onSortChange]
  );

  // eslint-disable-next-line
  const table = useReactTable({
    data: {feature}s,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount: totalPages,
    state: {
      pagination: {
        pageIndex: page - 1,
        pageSize,
      },
    },
  });

  // Calculate active filters count
  const activeFiltersCount = /* calculate based on active filters */;

  return (
    <>
      {/* Search and Filters Row */}
      <div className="flex items-center gap-3">
        <div className="relative w-full sm:w-[400px] lg:w-[500px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or ID..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <FeatureFilters
          activeFiltersCount={activeFiltersCount}
          // ... filter props
          onStatusesChange={onStatusesChange}
          // ... other filter handlers
        />
        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            <X />
            Clear all
          </Button>
        )}
        <div className="ml-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" disabled={isExporting}>
                <Loader2 className={cn('hidden animate-spin', isExporting && 'block')} />
                <Download className={cn('block', isExporting && 'hidden')} />
                Export
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-30 p-2" align="end">
              {exportTypeEnum.options.map((type) => (
                <Button
                  key={type}
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => onExport(type)}
                  disabled={isExporting}
                >
                  {type.toUpperCase()}
                </Button>
              ))}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Active Filters Badges */}
      <ActiveFilterBadges
        // ... filter props
        onStatusesChange={onStatusesChange}
        // ... other filter handlers
      />

      {/* Table */}
      <div className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => onView(row.original.id)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No results.{' '}
                    {searchQuery || activeFiltersCount > 0
                      ? 'Try adjusting your filters'
                      : 'Create your first {feature} to get started'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {{feature}s.length > 0 && (
          <DataTablePagination
            table={table}
            totalRecords={total}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        )}
      </div>
    </>
  );
}
```

**Page Component Pattern:**

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { trpc } from '@/lib/trpc/client';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { useTableSearch } from '@/hooks/use-table-search';
import { useToast } from '@/hooks/use-toast';

import { TableSkeleton } from '@/components/data-table/data-table-skeleton';
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

import { FeatureDataTable } from './components/feature-data-table';

export default function FeaturePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);

  const pagination = useTablePagination({ initialPage: 1, initialPageSize: 20 });

  const { inputValue, searchValue, setSearchValue } = useTableSearch({
    initialValue: '',
    debounceMs: 500,
  });

  // Reset to first page when search value changes
  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    if (pagination.page !== 1) {
      pagination.goToFirstPage();
    }
  };

  const { data, isLoading, refetch } = trpc.feature.list.useQuery(
    {
      searchQuery: searchValue.trim() || undefined, // Use debounced value for API
      page: pagination.page,
      pageSize: pagination.pageSize,
    },
    {
      placeholderData: (previousData) => previousData,
      staleTime: 1000 * 60 * 2,
    }
  );

  const deleteItem = trpc.feature.delete.useMutation({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Item deleted successfully' });
      refetch();
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleViewClick = (id: string) => {
    router.push(`/feature/${id}`);
  };

  const handleDeleteClick = (id: string, name: string) => {
    setItemToDelete({ id, name });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    await deleteItem.mutateAsync({ id: itemToDelete.id });
  };

  if (isLoading) {
    return <TableSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Features</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage all features</p>
      </div>

      <FeatureDataTable
        features={data?.features ?? []}
        total={data?.total ?? 0}
        page={data?.page ?? 1}
        pageSize={data?.pageSize ?? 20}
        totalPages={data?.totalPages ?? 0}
        searchQuery={inputValue}
        onSearchChange={handleSearchChange}
        onPageChange={pagination.setPage}
        onPageSizeChange={pagination.setPageSize}
        onView={handleViewClick}
        onDelete={handleDeleteClick}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {itemToDelete &&
                `Are you sure you want to delete "${itemToDelete.name}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteItem.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteItem.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteItem.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

#### **📄 Detail Page Implementation Pattern**

> **Note on the example below:** the snippet contains a `Back to {feature}s` link, which
> contradicts the "NEVER create back buttons in detail pages" rule stated above. The rule
> wins. Treat the back link in this example as illustrative of the surrounding layout only,
> and omit it in real detail pages — the empty/not-found state is the one place a link back
> to the list is acceptable.

**Detail Page Structure:**

```typescript
'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash, Calendar, User, CircleDollarSign, Info, Hash } from 'lucide-react';
// ... other imports
import { trpc } from '@/lib/trpc/client';
import { useOrganization } from '@/hooks/use-organization';
import { useFeature } from '@/hooks/use-feature';
import { featureStatusEnum, type FeatureStatus } from '@/lib/db/schema';
import { statusColors } from '../utils';
import { format } from 'date-fns';
import { updateFeatureSchema } from '@/lib/trpc/schemas/{feature}';
import type { z } from 'zod';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// Skeleton for loading state (MANDATORY)
function FeatureDetailSkeleton() {
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

interface FeatureDetailPageProps {
  params: Promise<{
    slug: string;
    id: string;
  }>;
}

export default function FeatureDetailPage({ params }: FeatureDetailPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { organization: activeOrganization, isLoading: isLoadingOrg } = useOrganization();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const utils = trpc.useUtils();

  const { data: feature, isLoading } = trpc.{feature}.get.useQuery(
    { id: resolvedParams.id },
    {
      staleTime: 1000 * 60 * 2, // 2 minutes
      enabled: !!resolvedParams.id,
    }
  );

  const { updateFeature, deleteFeature, isDeleting } = useFeature({
    organizationId: activeOrganization?.id ?? '',
  });

  const handleDelete = async () => {
    await deleteFeature(resolvedParams.id);
    router.push(`/org/${resolvedParams.slug}/{feature}s`);
  };

  const handleValidate = (
    field: keyof Omit<z.infer<typeof updateFeatureSchema>, 'id'>,
    value: string | number | Date | FeatureStatus
  ) => {
    if (!feature) return;

    // Clear previous error for this field
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });

    // Validate using the schema
    const updates = { id: resolvedParams.id, [field]: value };
    const result = updateFeatureSchema.safeParse(updates);

    if (!result.success) {
      const fieldError = result.error.issues.find((issue) => issue.path[0] === field);
      if (fieldError) {
        setFieldErrors((prev) => ({ ...prev, [field]: fieldError.message }));
      }
    }
  };

  const handleUpdate = async (
    field: keyof Omit<z.infer<typeof updateFeatureSchema>, 'id'>,
    value: string | number | Date | FeatureStatus
  ) => {
    if (!feature) return;

    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });

    const updates = { id: resolvedParams.id, [field]: value };
    const result = updateFeatureSchema.safeParse(updates);

    if (!result.success) {
      const fieldError = result.error.issues.find((issue) => issue.path[0] === field);
      if (fieldError) {
        setFieldErrors((prev) => ({ ...prev, [field]: fieldError.message }));
      }
      return;
    }

    const processedValue = result.data[field];
    const originalValue = feature[field as keyof typeof feature];
    if (originalValue === processedValue) return;

    // Optimistic update with validated data
    utils.{feature}.get.setData({ id: resolvedParams.id }, (old) => {
      if (!old) return old;
      return { ...old, [field]: processedValue };
    });

    await updateFeature(result.data);
  };

  if (isLoadingOrg || isLoading) {
    return <FeatureDetailSkeleton />;
  }

  if (!feature) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <h3 className="font-semibold text-lg mb-1">Feature not found</h3>
        <p className="text-sm text-muted-foreground mb-4">
          The feature you&apos;re looking for doesn&apos;t exist or has been deleted.
        </p>
        <Button asChild>
          <Link href={`/org/${resolvedParams.slug}/{feature}s`}>
            <ArrowLeft /> Back to {feature}s
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
        <Link href={`/org/${resolvedParams.slug}/{feature}s`}>
          <ArrowLeft className="h-4 w-4" />
          Back to {feature}s
        </Link>
      </Button>

      <h1 className="text-xl font-semibold">Feature Details</h1>

      <div className="mt-4">
        {/* Feature fields fields go here */}
        <Field data-invalid={!!fieldErrors.name}>
          <div className="flex items-start gap-4 py-1.5">
            <User className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
            <div className="text-sm text-muted-foreground w-28 shrink-0 pt-2">Name</div>
            <FieldContent className="flex-1">
              <div className="hover:bg-muted/50 rounded-md transition-colors">
                <Input
                  id="name"
                  defaultValue={feature.name}
                  onChange={(e) => handleValidate('name', e.target.value)}
                  onBlur={(e) => handleUpdate('name', e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') {
                      e.currentTarget.blur();
                    }
                  }}
                  aria-invalid={!!fieldErrors.name}
                  className={cn(
                    'h-9 text-sm border-0 cursor-text bg-transparent dark:bg-transparent',
                    'focus:border-input dark:focus:border-input'
                  )}
                  placeholder="Enter name"
                />
              </div>
              <FieldError>{fieldErrors.name}</FieldError>
            </FieldContent>
          </div>
        </Field>

      <div className="mt-8">
        <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
          <Trash />
          Delete feature
        </Button>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete feature {feature.name}. This action cannot be undone.
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
```

A properly implemented table + detail page feature should have:

- ✅ **Server-side filtering, sorting, and pagination**
- ✅ **Type-safe tRPC integration with inferred types**
- ✅ **Comprehensive loading states with skeletons**
- ✅ **Detail page for viewing only (read-only display)**
- ✅ **Edit actions via modal dialogs (not inline editing)**
- ✅ **Responsive design**
- ✅ **Proper error handling**
- ✅ **Accessibility compliance**
- ✅ **Consistent UI/UX with existing features**
- ✅ **Clean, maintainable code structure**
