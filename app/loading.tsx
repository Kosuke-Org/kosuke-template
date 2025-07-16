import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  // This loading component shows while user data is being fetched during authentication
  // See: https://nextjs.org/docs/app/api-reference/file-conventions/loading
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header skeleton */}
      <div className="h-16 border-b px-4 flex items-center gap-2">
        <Skeleton className="h-8 w-24" />
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-4">
          <div className="text-center space-y-2">
            <Skeleton className="h-8 w-32 mx-auto" />
            <Skeleton className="h-4 w-48 mx-auto" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
