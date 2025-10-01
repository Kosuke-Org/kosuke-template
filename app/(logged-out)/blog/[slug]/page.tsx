import Image from 'next/image';
import { notFound } from 'next/navigation';
import { createCaller } from '@/lib/trpc/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function BlogPostSkeleton() {
  return (
    <div className="container max-w-3xl pt-12 sm:pt-20 pb-16 px-4 sm:px-6 space-y-6">
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-64 w-full" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    </div>
  );
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const caller = await createCaller();
  const post = await caller.cms.blog.bySlug({ slug: params.slug });
  if (!post) return notFound();

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl pt-12 sm:pt-20 pb-16 px-4 sm:px-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">{post.title}</h1>
          <p className="text-muted-foreground text-sm">
            {new Date(post.publishedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        {post.coverImageUrl ? (
          <div className="relative w-full h-64 rounded-lg overflow-hidden">
            <Image
              src={post.coverImageUrl}
              alt={post.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 800px"
            />
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {post.excerpt ? <p className="text-muted-foreground">{post.excerpt}</p> : null}
          </CardContent>
        </Card>

        <article className="prose prose-neutral dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
      </div>
    </div>
  );
}

export function Loading() {
  return <BlogPostSkeleton />;
}

