import { Loader2 } from 'lucide-react';

export default function Loading() {
  // This loading component shows while user data is being fetched during authentication
  // See: https://nextjs.org/docs/app/api-reference/file-conventions/loading
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
