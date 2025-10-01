'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useDeferredValue, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { trpc } from '@/lib/trpc/client';

function BlogCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-2/3" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
    </Card>
  );
}

function BlogListSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <BlogCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default function BlogPage() {
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(searchInput);
  const querySearch = useMemo(() => (deferredSearch.trim() ? deferredSearch.trim() : undefined), [deferredSearch]);

  const { data: posts, isLoading, isFetching } = trpc.cms.blog.list.useQuery(
    { page, pageSize: 9, search: querySearch },
    { keepPreviousData: true, staleTime: 1000 * 60 * 2 }
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl pt-12 sm:pt-20 pb-16 px-4 sm:px-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Blog</h1>
            <p className="text-muted-foreground mt-2">Insights, updates, and best practices.</p>
          </div>
          <div className="w-full sm:w-80">
            <Input placeholder="Search articles" onChange={(e) => setSearchInput(e.target.value)} aria-label="Search blog posts" />
          </div>
        </div>

        {isLoading ? (
          <BlogListSkeleton />
        ) : posts && posts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Card key={post.slug} className="overflow-hidden">
                {post.coverImageUrl ? (
                  <div className="relative h-48 w-full">
                    <Image
                      src={post.coverImageUrl}
                      alt={post.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                ) : null}
                <CardHeader>
                  <CardTitle className="line-clamp-2">{post.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {post.excerpt ? (
                    <p className="text-muted-foreground line-clamp-3">{post.excerpt}</p>
                  ) : null}
                  <Link href={`/blog/${post.slug}`}>
                    <Button variant="secondary">Read more</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground">No posts found.</div>
        )}

        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" disabled={page === 1 || isFetching} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page}</span>
          <Button variant="outline" disabled={isFetching || (posts && posts.length < 9)} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

