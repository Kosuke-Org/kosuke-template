import { createCaller } from '@/lib/trpc/server';
import { Skeleton } from '@/components/ui/skeleton';

function PrivacySkeleton() {
  return (
    <div className="container max-w-4xl pt-12 sm:pt-20 pb-16 px-4 sm:px-6 space-y-4">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-4 w-1/3" />
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  );
}

export default async function PrivacyPage() {
  const caller = await createCaller();
  const page = await caller.cms.page.bySlug({ slug: 'privacy' });

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl pt-12 sm:pt-20 pb-16 px-4 sm:px-6">
        {!page ? (
          <PrivacySkeleton />
        ) : (
          <div className="space-y-4">
            <div className="mb-8">
              <h1 className="text-4xl font-bold tracking-tight">{page.title}</h1>
              <p className="text-muted-foreground mt-2">
                Last updated:{' '}
                {new Date(page.updatedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>

            <div className="prose prose-neutral dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: page.contentHtml }} />
          </div>
        )}
      </div>
    </div>
  );
}
